import { hexFromU8, u8FromHex } from './util/hex';

const txtEnc = new TextEncoder();

async function hkdfExtract(salt: Uint8Array, keyMaterial: Uint8Array, hashBits: 256 | 384) {
  /* 
  from https://www.ietf.org/rfc/rfc5869.txt:

  HKDF-Extract(salt, IKM) -> PRK

  Options:
    Hash     a hash function; HashLen denotes the length of the
              hash function output in octets

  Inputs:
    salt     optional salt value (a non-secret random value);
              if not provided, it is set to a string of HashLen zeros.
    IKM      input keying material

  Output:
    PRK      a pseudorandom key (of HashLen octets)

  The output PRK is calculated as follows:

  PRK = HMAC-Hash(salt, IKM)
  */

  const hmacKey = await crypto.subtle.importKey('raw', salt, { name: 'HMAC', hash: { name: `SHA-${hashBits}` } }, false, ['sign']);
  var prk = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, keyMaterial));  // yes, the key material is used as the input data, not the key
  return prk;
}

async function hkdfExpand(key: Uint8Array, info: Uint8Array, length: number, hashBits: 256 | 384) {
  /*
  from https://www.ietf.org/rfc/rfc5869.txt:

  HKDF-Expand(PRK, info, L) -> OKM

  Options:
    Hash     a hash function; HashLen denotes the length of the
              hash function output in octets

  Inputs:
    PRK      a pseudorandom key of at least HashLen octets
              (usually, the output from the extract step)
    info     optional context and application specific information
              (can be a zero-length string)
    L        length of output keying material in octets
              (<= 255*HashLen)

  Output:
    OKM      output keying material (of L octets)

  The output OKM is calculated as follows:

  N = ceil(L/HashLen)
  T = T(1) | T(2) | T(3) | ... | T(N)
  OKM = first L octets of T

  where:
  T(0) = empty string (zero length)
  T(1) = HMAC-Hash(PRK, T(0) | info | 0x01)
  T(2) = HMAC-Hash(PRK, T(1) | info | 0x02)
  T(3) = HMAC-Hash(PRK, T(2) | info | 0x03)
  ...

  (where the constant concatenated to the end of each T(n) is a
  single octet.)
  */

  const hashBytes = hashBits >> 3;
  const n = Math.ceil(length / hashBytes);

  const okm = new Uint8Array(n * hashBytes);
  const hmacKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: { name: `SHA-${hashBits}` } }, false, ['sign']);
  const infoLength = info.length;

  let tPrev = new Uint8Array(0);
  for (let i = 0; i < n; i++) {
    const tPrevLength = tPrev.length;

    const hmacData = new Uint8Array(tPrevLength + infoLength + 1);
    hmacData.set(tPrev);
    hmacData.set(info, tPrevLength);
    hmacData[tPrevLength + infoLength] = i + 1; // starts at 1

    const tiBuffer = await crypto.subtle.sign('HMAC', hmacKey, hmacData);
    const ti = new Uint8Array(tiBuffer);
    okm.set(ti, hashBytes * i);

    tPrev = ti;
  }

  return okm.subarray(0, length);
}

const tls13_Bytes = txtEnc.encode('tls13 ');

async function hkdfExpandLabel(key: Uint8Array, label: Uint8Array, context: Uint8Array, length: number, hashBits: 256 | 384) {
  /*
  from https://www.rfc-editor.org/rfc/rfc8446#section-7.1:

  HKDF-Expand-Label(Secret, Label, Context, Length) =
          HKDF-Expand(Secret, HkdfLabel, Length)

      Where HkdfLabel is specified as:

      struct {
          uint16 length = Length;
          opaque label<7..255> = "tls13 " + Label;
          opaque context<0..255> = Context;
      } HkdfLabel;
  */

  const labelLength = label.length;
  const contextLength = context.length;

  const hkdfLabel = new Uint8Array(2 + 1 + 6 + labelLength + 1 + contextLength);

  // desired length, split into high and low bytes
  hkdfLabel[0] = (length & 0xff00) >> 8;
  hkdfLabel[1] = length & 0xff;

  // label length (including "tls13 " prefix)
  hkdfLabel[2] = labelLength + 6;
  // label, including "tls13 " prefix
  hkdfLabel.set(tls13_Bytes, 2 + 1);
  hkdfLabel.set(label, 2 + 1 + 6);

  // context length
  hkdfLabel[2 + 1 + 6 + labelLength] = contextLength;
  // context
  hkdfLabel.set(context, 2 + 1 + 6 + labelLength + 1);

  return hkdfExpand(key, hkdfLabel, length, hashBits);
}

export async function getHandshakeKeysTest() {
  // https://tls13.xargs.org/#server-handshake-keys-calc
  // $ hello_hash = e05f64fcd082bdb0dce473adf669c2769f257a1c75a51b7887468b5e0e7a7de4f4d34555112077f16e079019d5a845bd
  // $ shared_secret = df4a291baa1eb7cfa6934b29b474baad2697e29f1f920dcc77c8a0a088447624
  const hellosHash = u8FromHex('e05f64fcd082bdb0dce473adf669c2769f257a1c75a51b7887468b5e0e7a7de4f4d34555112077f16e079019d5a845bd');
  const sharedSecret = u8FromHex('df4a291baa1eb7cfa6934b29b474baad2697e29f1f920dcc77c8a0a088447624');
  return getHandshakeKeys(sharedSecret, hellosHash, 384, 32);
}

export async function getHandshakeKeys(sharedSecret: Uint8Array, hellosHash: Uint8Array, hashBits: 256 | 384, keyLength: 16 | 32) {  // keyLength: 16 for ASE128, 32 for AES256
  const hashBytes = hashBits >> 3;

  // $ zero_key = 000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000
  const zeroKey = new Uint8Array(hashBytes);

  // $ early_secret = $(./hkdf-384 extract 00 $zero_key)
  const earlySecret = await hkdfExtract(new Uint8Array(1), zeroKey, hashBits);
  console.log('early secret', hexFromU8(new Uint8Array(earlySecret)));

  // $ empty_hash = $(openssl sha384 < /dev/null | sed - e 's/.* //')
  const emptyHashBuffer = await crypto.subtle.digest(`SHA-${hashBits}`, new Uint8Array(0));
  const emptyHash = new Uint8Array(emptyHashBuffer);
  console.log('empty hash', hexFromU8(emptyHash));

  // $ derived_secret = $(./hkdf-384 expandlabel $early_secret "derived" $empty_hash 48)
  const derivedSecret = await hkdfExpandLabel(earlySecret, txtEnc.encode('derived'), emptyHash, hashBytes, hashBits);
  console.log('derived secret', hexFromU8(derivedSecret));

  // $ handshake_secret = $(./hkdf-384 extract $derived_secret $shared_secret)
  const handshakeSecret = await hkdfExtract(derivedSecret, sharedSecret, hashBits);
  console.log('handshake secret', hexFromU8(handshakeSecret));

  // $ csecret = $(./hkdf-384 expandlabel $handshake_secret "c hs traffic" $hello_hash 48)
  const clientSecret = await hkdfExpandLabel(handshakeSecret, txtEnc.encode('c hs traffic'), hellosHash, hashBytes, hashBits);
  console.log('client secret', hexFromU8(clientSecret));

  // $ ssecret = $(./hkdf-384 expandlabel $handshake_secret "s hs traffic" $hello_hash 48)
  const serverSecret = await hkdfExpandLabel(handshakeSecret, txtEnc.encode('s hs traffic'), hellosHash, hashBytes, hashBits);
  console.log('server secret', hexFromU8(serverSecret));

  // $ client_handshake_key = $(./hkdf-384 expandlabel $csecret "key" "" 32)
  const clientHandshakeKey = await hkdfExpandLabel(clientSecret, txtEnc.encode('key'), new Uint8Array(0), keyLength, hashBits);
  console.log('client handshake key', hexFromU8(clientHandshakeKey));

  // $ server_handshake_key = $(./hkdf-384 expandlabel $ssecret "key" "" 32)
  const serverHandshakeKey = await hkdfExpandLabel(serverSecret, txtEnc.encode('key'), new Uint8Array(0), keyLength, hashBits);
  console.log('server handshake key', hexFromU8(serverHandshakeKey));

  // $ client_handshake_iv = $(./hkdf-384 expandlabel $csecret "iv" "" 12)
  const clientHandshakeIV = await hkdfExpandLabel(clientSecret, txtEnc.encode('iv'), new Uint8Array(0), 12, hashBits);
  console.log('client handshake iv', hexFromU8(clientHandshakeIV));

  // $ server_handshake_iv = $(./hkdf-384 expandlabel $ssecret "iv" "" 12)
  const serverHandshakeIV = await hkdfExpandLabel(serverSecret, txtEnc.encode('iv'), new Uint8Array(0), 12, hashBits);
  console.log('server handshake iv', hexFromU8(serverHandshakeIV));

  return { serverHandshakeKey, serverHandshakeIV, clientHandshakeKey, clientHandshakeIV };
}
