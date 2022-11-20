import { hexFromU8 } from '../util/hex';
import { concat } from '../util/array';
import { log } from '../presentation/log';

const txtEnc = new TextEncoder();

export async function hkdfExtract(salt: Uint8Array, keyMaterial: Uint8Array, hashBits: 256 | 384) {
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

export async function hkdfExpand(key: Uint8Array, info: Uint8Array, length: number, hashBits: 256 | 384) {
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

  let tPrev = new Uint8Array(0);
  for (let i = 0; i < n; i++) {
    const hmacData = concat(tPrev, info, [i + 1]);
    const tiBuffer = await crypto.subtle.sign('HMAC', hmacKey, hmacData);
    const ti = new Uint8Array(tiBuffer);
    okm.set(ti, hashBytes * i);
    tPrev = ti;
  }

  return okm.subarray(0, length);
}

const tls13_Bytes = txtEnc.encode('tls13 ');

export async function hkdfExpandLabel(key: Uint8Array, label: string, context: Uint8Array, length: number, hashBits: 256 | 384) {
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
  const labelData = txtEnc.encode(label);
  const hkdfLabel = concat(
    [(length & 0xff00) >> 8, length & 0xff],  // desired length, split into high + low bytes
    [tls13_Bytes.length + labelData.length], tls13_Bytes, labelData,
    [context.length], context,
  );
  return hkdfExpand(key, hkdfLabel, length, hashBits);
}

export async function getHandshakeKeys(serverPublicKey: Uint8Array, privateKey: CryptoKey, hellos: Uint8Array, hashBits: 256 | 384, keyLength: 16 | 32) {  // keyLength: 16 for ASE128, 32 for AES256
  const hashBytes = hashBits >> 3;
  const zeroKey = new Uint8Array(hashBytes);

  const publicKey = await crypto.subtle.importKey('raw', serverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false /* extractable */, []);
  const sharedSecretBuffer = await crypto.subtle.deriveBits({ name: 'ECDH', public: publicKey }, privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBuffer);
  chatty && log('shared secret', hexFromU8(sharedSecret));

  const hellosHashBuffer = await crypto.subtle.digest('SHA-256', hellos);
  const hellosHash = new Uint8Array(hellosHashBuffer);
  chatty && log('hellos hash', hexFromU8(hellosHash));

  const earlySecret = await hkdfExtract(new Uint8Array(1), zeroKey, hashBits);
  chatty && log('early secret', hexFromU8(new Uint8Array(earlySecret)));

  const emptyHashBuffer = await crypto.subtle.digest(`SHA-${hashBits}`, new Uint8Array(0));
  const emptyHash = new Uint8Array(emptyHashBuffer);
  chatty && log('empty hash', hexFromU8(emptyHash));

  const derivedSecret = await hkdfExpandLabel(earlySecret, 'derived', emptyHash, hashBytes, hashBits);
  chatty && log('derived secret', hexFromU8(derivedSecret));

  const handshakeSecret = await hkdfExtract(derivedSecret, sharedSecret, hashBits);
  chatty && log('handshake secret', hexFromU8(handshakeSecret));

  const clientSecret = await hkdfExpandLabel(handshakeSecret, 'c hs traffic', hellosHash, hashBytes, hashBits);
  chatty && log('client secret', hexFromU8(clientSecret));

  const serverSecret = await hkdfExpandLabel(handshakeSecret, 's hs traffic', hellosHash, hashBytes, hashBits);
  chatty && log('server secret', hexFromU8(serverSecret));

  const clientHandshakeKey = await hkdfExpandLabel(clientSecret, 'key', new Uint8Array(0), keyLength, hashBits);
  chatty && log('client handshake key', hexFromU8(clientHandshakeKey));

  const serverHandshakeKey = await hkdfExpandLabel(serverSecret, 'key', new Uint8Array(0), keyLength, hashBits);
  chatty && log('server handshake key', hexFromU8(serverHandshakeKey));

  const clientHandshakeIV = await hkdfExpandLabel(clientSecret, 'iv', new Uint8Array(0), 12, hashBits);
  chatty && log('client handshake iv', hexFromU8(clientHandshakeIV));

  const serverHandshakeIV = await hkdfExpandLabel(serverSecret, 'iv', new Uint8Array(0), 12, hashBits);
  chatty && log('server handshake iv', hexFromU8(serverHandshakeIV));

  return { serverHandshakeKey, serverHandshakeIV, clientHandshakeKey, clientHandshakeIV, handshakeSecret, clientSecret, serverSecret };
}

export async function getApplicationKeys(handshakeSecret: Uint8Array, handshakeHash: Uint8Array, hashBits: 256 | 384, keyLength: 16 | 32) {  // keyLength: 16 for ASE128, 32 for AES256
  const hashBytes = hashBits >> 3;
  const zeroKey = new Uint8Array(hashBytes);

  const emptyHashBuffer = await crypto.subtle.digest(`SHA-${hashBits}`, new Uint8Array(0));
  const emptyHash = new Uint8Array(emptyHashBuffer);
  chatty && log('empty hash', hexFromU8(emptyHash));

  const derivedSecret = await hkdfExpandLabel(handshakeSecret, 'derived', emptyHash, hashBytes, hashBits);
  chatty && log('derived secret', hexFromU8(derivedSecret));

  const masterSecret = await hkdfExtract(derivedSecret, zeroKey, hashBits);
  chatty && log('master secret', hexFromU8(masterSecret));

  const clientSecret = await hkdfExpandLabel(masterSecret, 'c ap traffic', handshakeHash, hashBytes, hashBits);
  chatty && log('client secret', hexFromU8(clientSecret));

  const serverSecret = await hkdfExpandLabel(masterSecret, 's ap traffic', handshakeHash, hashBytes, hashBits);
  chatty && log('server secret', hexFromU8(serverSecret));

  const clientApplicationKey = await hkdfExpandLabel(clientSecret, 'key', new Uint8Array(0), keyLength, hashBits);
  chatty && log('client application key', hexFromU8(clientApplicationKey));

  const serverApplicationKey = await hkdfExpandLabel(serverSecret, 'key', new Uint8Array(0), keyLength, hashBits);
  chatty && log('server application key', hexFromU8(serverApplicationKey));

  const clientApplicationIV = await hkdfExpandLabel(clientSecret, 'iv', new Uint8Array(0), 12, hashBits);
  chatty && log('client application iv', hexFromU8(clientApplicationIV));

  const serverApplicationIV = await hkdfExpandLabel(serverSecret, 'iv', new Uint8Array(0), 12, hashBits);
  chatty && log('server application iv', hexFromU8(serverApplicationIV));

  return { serverApplicationKey, serverApplicationIV, clientApplicationKey, clientApplicationIV };
}