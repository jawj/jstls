var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/util/array.ts
function concat(...arrs) {
  if (arrs.length === 1 && arrs[0] instanceof Uint8Array)
    return arrs[0];
  const length = arrs.reduce((memo, arr) => memo + arr.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const arr of arrs) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
function equal(a, b) {
  const aLength = a.length;
  if (aLength !== b.length)
    return false;
  for (let i = 0; i < aLength; i++)
    if (a[i] !== b[i])
      return false;
  return true;
}
var init_array = __esm({
  "src/util/array.ts"() {
    "use strict";
  }
});

// src/presentation/appearance.ts
var indentChars;
var init_appearance = __esm({
  "src/presentation/appearance.ts"() {
    "use strict";
    indentChars = "\xB7\xB7 ";
  }
});

// src/util/bytes.ts
var txtEnc, txtDec, Bytes;
var init_bytes = __esm({
  "src/util/bytes.ts"() {
    "use strict";
    init_array();
    init_appearance();
    txtEnc = new TextEncoder();
    txtDec = new TextDecoder();
    Bytes = class {
      offset;
      dataView;
      data;
      comments;
      indents;
      indent;
      constructor(arrayOrMaxBytes) {
        this.offset = 0;
        this.data = typeof arrayOrMaxBytes === "number" ? new Uint8Array(arrayOrMaxBytes) : arrayOrMaxBytes;
        this.dataView = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        this.comments = {};
        this.indents = {};
        this.indent = 0;
      }
      extend(arrayOrMaxBytes) {
        const newData = typeof arrayOrMaxBytes === "number" ? new Uint8Array(arrayOrMaxBytes) : arrayOrMaxBytes;
        this.data = concat(this.data, newData);
        this.dataView = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
      }
      remaining() {
        return this.data.length - this.offset;
      }
      subarray(length) {
        return this.data.subarray(this.offset, this.offset += length);
      }
      skip(length, comment) {
        this.offset += length;
        if (comment)
          this.comment(comment);
        return this;
      }
      comment(s, offset = this.offset) {
        if (true)
          throw new Error("No comments should be emitted outside of chatty mode");
        const existing = this.comments[offset];
        const result = (existing === void 0 ? "" : existing + " ") + s;
        this.comments[offset] = result;
        return this;
      }
      readBytes(length) {
        return this.data.slice(this.offset, this.offset += length);
      }
      readUTF8String(length) {
        const bytes = this.subarray(length);
        const s = txtDec.decode(bytes);
        return s;
      }
      readUTF8StringNullTerminated() {
        let endOffset = this.offset;
        while (this.data[endOffset] !== 0)
          endOffset++;
        const str = this.readUTF8String(endOffset - this.offset);
        this.expectUint8(0, "end of string");
        return str;
      }
      readUint8(comment) {
        const result = this.dataView.getUint8(this.offset);
        this.offset += 1;
        if (false)
          this.comment(comment.replace(/%/g, String(result)));
        return result;
      }
      readUint16(comment) {
        const result = this.dataView.getUint16(this.offset);
        this.offset += 2;
        if (false)
          this.comment(comment.replace(/%/g, String(result)));
        return result;
      }
      readUint24(comment) {
        const msb = this.readUint8();
        const lsbs = this.readUint16();
        const result = (msb << 16) + lsbs;
        if (false)
          this.comment(comment.replace(/%/g, String(result)));
        return result;
      }
      readUint32(comment) {
        const result = this.dataView.getUint32(this.offset);
        this.offset += 4;
        if (false)
          this.comment(comment.replace(/%/g, String(result)));
        return result;
      }
      expectBytes(expected, comment) {
        const actual = this.readBytes(expected.length);
        if (false)
          this.comment(comment);
        if (!equal(actual, expected))
          throw new Error(`Unexpected bytes`);
      }
      expectUint8(expectedValue, comment) {
        const actualValue = this.readUint8();
        if (false)
          this.comment(comment);
        if (actualValue !== expectedValue)
          throw new Error(`Expected ${expectedValue}, got ${actualValue}`);
      }
      expectUint16(expectedValue, comment) {
        const actualValue = this.readUint16();
        if (false)
          this.comment(comment);
        if (actualValue !== expectedValue)
          throw new Error(`Expected ${expectedValue}, got ${actualValue}`);
      }
      expectUint24(expectedValue, comment) {
        const actualValue = this.readUint24();
        if (false)
          this.comment(comment);
        if (actualValue !== expectedValue)
          throw new Error(`Expected ${expectedValue}, got ${actualValue}`);
      }
      expectUint32(expectedValue, comment) {
        const actualValue = this.readUint32();
        if (false)
          this.comment(comment);
        if (actualValue !== expectedValue)
          throw new Error(`Expected ${expectedValue}, got ${actualValue}`);
      }
      expectLength(length, indentDelta = 1) {
        const startOffset = this.offset;
        const endOffset = startOffset + length;
        if (endOffset > this.data.length)
          throw new Error("Expected length exceeds remaining data length");
        this.indent += indentDelta;
        this.indents[startOffset] = this.indent;
        return [
          () => {
            this.indent -= indentDelta;
            this.indents[this.offset] = this.indent;
            if (this.offset !== endOffset)
              throw new Error(`${length} bytes expected but ${this.offset - startOffset} read`);
          },
          () => endOffset - this.offset
        ];
      }
      expectLengthUint8(comment) {
        const length = this.readUint8();
        return this.expectLength(length);
      }
      expectLengthUint16(comment) {
        const length = this.readUint16();
        return this.expectLength(length);
      }
      expectLengthUint24(comment) {
        const length = this.readUint24();
        return this.expectLength(length);
      }
      expectLengthUint32(comment) {
        const length = this.readUint32();
        return this.expectLength(length);
      }
      expectLengthUint8Incl(comment) {
        const length = this.readUint8();
        return this.expectLength(length - 1);
      }
      expectLengthUint16Incl(comment) {
        const length = this.readUint16();
        return this.expectLength(length - 2);
      }
      expectLengthUint24Incl(comment) {
        const length = this.readUint24();
        return this.expectLength(length - 3);
      }
      expectLengthUint32Incl(comment) {
        const length = this.readUint32();
        return this.expectLength(length - 4);
      }
      writeBytes(bytes) {
        this.data.set(bytes, this.offset);
        this.offset += bytes.length;
        return this;
      }
      writeUTF8String(s) {
        const bytes = txtEnc.encode(s);
        this.writeBytes(bytes);
        return this;
      }
      writeUTF8StringNullTerminated(s) {
        const bytes = txtEnc.encode(s);
        this.writeBytes(bytes);
        this.writeUint8(0);
        return this;
      }
      writeUint8(value, comment) {
        this.dataView.setUint8(this.offset, value);
        this.offset += 1;
        if (false)
          this.comment(comment);
        return this;
      }
      writeUint16(value, comment) {
        this.dataView.setUint16(this.offset, value);
        this.offset += 2;
        if (false)
          this.comment(comment);
        return this;
      }
      writeUint24(value, comment) {
        this.writeUint8((value & 16711680) >> 16);
        this.writeUint16(value & 65535, comment);
        return this;
      }
      writeUint32(value, comment) {
        this.dataView.setUint32(this.offset, value);
        this.offset += 4;
        if (false)
          this.comment(comment);
        return this;
      }
      _writeLengthGeneric(lengthBytes, inclusive, comment) {
        const startOffset = this.offset;
        this.offset += lengthBytes;
        const endOffset = this.offset;
        this.indent += 1;
        this.indents[endOffset] = this.indent;
        return () => {
          const length = this.offset - (inclusive ? startOffset : endOffset);
          if (lengthBytes === 1)
            this.dataView.setUint8(startOffset, length);
          else if (lengthBytes === 2)
            this.dataView.setUint16(startOffset, length);
          else if (lengthBytes === 3) {
            this.dataView.setUint8(startOffset, (length & 16711680) >> 16);
            this.dataView.setUint16(startOffset + 1, length & 65535);
          } else if (lengthBytes === 4)
            this.dataView.setUint32(startOffset, length);
          else
            throw new Error(`Invalid length for length field: ${lengthBytes}`);
          this.indent -= 1;
          this.indents[this.offset] = this.indent;
        };
      }
      writeLengthUint8(comment) {
        return this._writeLengthGeneric(1, false, comment);
      }
      writeLengthUint16(comment) {
        return this._writeLengthGeneric(2, false, comment);
      }
      writeLengthUint24(comment) {
        return this._writeLengthGeneric(3, false, comment);
      }
      writeLengthUint32(comment) {
        return this._writeLengthGeneric(4, false, comment);
      }
      writeLengthUint8Incl(comment) {
        return this._writeLengthGeneric(1, true, comment);
      }
      writeLengthUint16Incl(comment) {
        return this._writeLengthGeneric(2, true, comment);
      }
      writeLengthUint24Incl(comment) {
        return this._writeLengthGeneric(3, true, comment);
      }
      writeLengthUint32Incl(comment) {
        return this._writeLengthGeneric(4, true, comment);
      }
      array() {
        return this.data.subarray(0, this.offset);
      }
      commentedString(all = false) {
        let s = this.indents[0] !== void 0 ? indentChars.repeat(this.indents[0]) : "";
        let indent = this.indents[0] ?? 0;
        const len = all ? this.data.length : this.offset;
        for (let i = 0; i < len; i++) {
          s += this.data[i].toString(16).padStart(2, "0") + " ";
          const comment = this.comments[i + 1];
          if (this.indents[i + 1] !== void 0)
            indent = this.indents[i + 1];
          if (comment)
            s += ` ${comment}
${indentChars.repeat(indent)}`;
        }
        return s;
      }
    };
  }
});

// src/presentation/highlights.ts
var regex;
var init_highlights = __esm({
  "src/presentation/highlights.ts"() {
    "use strict";
    init_appearance();
    regex = new RegExp(`  .+|^(${indentChars})+`, "gm");
  }
});

// src/presentation/log.ts
function htmlEscape(s) {
  escapes ??= {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  };
  regexp ??= new RegExp("[" + Object.keys(escapes).join("") + "]", "g");
  return s.replace(regexp, (match) => escapes[match]);
}
function htmlFromLogArgs(...args) {
  let result = "<span>", arg, matchArr, separator = "";
  while ((arg = args.shift()) !== void 0) {
    arg = separator + htmlEscape(String(arg));
    separator = " ";
    const formatRegExp = /([\s\S]*?)%([csoOidf])|[\s\S]+/g;
    while ((matchArr = formatRegExp.exec(arg)) !== null) {
      const [whole, literal, sub] = matchArr;
      if (sub === void 0) {
        result += whole;
      } else {
        result += literal;
        if (sub === "c") {
          result += `</span><span style="${args.shift()}">`;
        } else if (sub === "s") {
          result += args.shift();
        } else if (sub === "o" || sub === "O") {
          result += JSON.stringify(args.shift(), void 0, sub === "O" ? 2 : void 0);
        } else if (sub === "i" || sub === "d" || sub === "f") {
          result += String(args.shift());
        }
      }
    }
  }
  result += "</span>";
  return result;
}
function log(...args) {
  console.log(...args, "\n");
  if (typeof document === "undefined")
    return;
  element ??= document.querySelector("#logs");
  element.innerHTML += `<label><input type="checkbox" name="c${c++}"><div class="section">` + htmlFromLogArgs(...args) + `</div></label>`;
}
var element, escapes, regexp, c;
var init_log = __esm({
  "src/presentation/log.ts"() {
    "use strict";
    c = 0;
  }
});

// src/tls/makeClientHello.ts
function makeClientHello(host, publicKey, sessionId, useSNI = true) {
  const h = new Bytes(1024);
  h.writeUint8(22, false);
  h.writeUint16(769, false);
  const endRecordHeader = h.writeLengthUint16();
  h.writeUint8(1, false);
  const endHandshakeHeader = h.writeLengthUint24();
  h.writeUint16(771, false);
  crypto.getRandomValues(h.subarray(32));
  const endSessionId = h.writeLengthUint8(false);
  h.writeBytes(sessionId);
  endSessionId();
  const endCiphers = h.writeLengthUint16(false);
  h.writeUint16(4865, false);
  endCiphers();
  const endCompressionMethods = h.writeLengthUint8(false);
  h.writeUint8(0, false);
  endCompressionMethods();
  const endExtensions = h.writeLengthUint16(false);
  if (useSNI) {
    h.writeUint16(0, false);
    const endSNIExt = h.writeLengthUint16(false);
    const endSNI = h.writeLengthUint16(false);
    h.writeUint8(0, false);
    const endHostname = h.writeLengthUint16(false);
    h.writeUTF8String(host);
    endHostname();
    endSNI();
    endSNIExt();
  }
  h.writeUint16(11, false);
  const endFormatTypesExt = h.writeLengthUint16(false);
  const endFormatTypes = h.writeLengthUint8(false);
  h.writeUint8(0, false);
  endFormatTypes();
  endFormatTypesExt();
  h.writeUint16(10, false);
  const endGroupsExt = h.writeLengthUint16(false);
  const endGroups = h.writeLengthUint16(false);
  h.writeUint16(23, false);
  endGroups();
  endGroupsExt();
  h.writeUint16(13, false);
  const endSigsExt = h.writeLengthUint16(false);
  const endSigs = h.writeLengthUint16(false);
  h.writeUint16(1027, false);
  h.writeUint16(2052, false);
  endSigs();
  endSigsExt();
  h.writeUint16(43, false);
  const endVersionsExt = h.writeLengthUint16(false);
  const endVersions = h.writeLengthUint8(false);
  h.writeUint16(772, false);
  endVersions();
  endVersionsExt();
  h.writeUint16(51, false);
  const endKeyShareExt = h.writeLengthUint16(false);
  const endKeyShares = h.writeLengthUint16(false);
  h.writeUint16(23, false);
  const endKeyShare = h.writeLengthUint16(false);
  h.writeBytes(new Uint8Array(publicKey));
  endKeyShare();
  endKeyShares();
  endKeyShareExt();
  endExtensions();
  endHandshakeHeader();
  endRecordHeader();
  return h;
}
var init_makeClientHello = __esm({
  "src/tls/makeClientHello.ts"() {
    "use strict";
    init_bytes();
  }
});

// src/util/hex.ts
function hexFromU8(u8, spacer = "") {
  return [...u8].map((n) => n.toString(16).padStart(2, "0")).join(spacer);
}
var init_hex = __esm({
  "src/util/hex.ts"() {
    "use strict";
  }
});

// src/tls/parseServerHello.ts
function parseServerHello(hello, sessionId) {
  let serverPublicKey;
  let tlsVersionSpecified;
  const [endServerHelloMessage] = hello.expectLength(hello.remaining());
  hello.expectUint8(2, false);
  const [endServerHello] = hello.expectLengthUint24(false);
  hello.expectUint16(771, false);
  const serverRandom = hello.readBytes(32);
  if (equal(serverRandom, [
    207,
    33,
    173,
    116,
    229,
    154,
    97,
    17,
    190,
    29,
    140,
    2,
    30,
    101,
    184,
    145,
    194,
    162,
    17,
    22,
    122,
    187,
    140,
    94,
    7,
    158,
    9,
    226,
    200,
    168,
    51,
    156
  ]))
    throw new Error("Unexpected HelloRetryRequest");
  hello.expectUint8(sessionId.length, false);
  hello.expectBytes(sessionId, false);
  hello.expectUint16(4865, false);
  hello.expectUint8(0, false);
  const [endExtensions, extensionsRemaining] = hello.expectLengthUint16(false);
  while (extensionsRemaining() > 0) {
    const extensionType = hello.readUint16(false);
    const [endExtension] = hello.expectLengthUint16(false);
    if (extensionType === 43) {
      hello.expectUint16(772, false);
      tlsVersionSpecified = true;
    } else if (extensionType === 51) {
      hello.expectUint16(23, false);
      hello.expectUint16(65);
      serverPublicKey = hello.readBytes(65);
    } else {
      throw new Error(`Unexpected extension 0x${hexFromU8([extensionType])}`);
    }
    endExtension();
  }
  endExtensions();
  endServerHello();
  endServerHelloMessage();
  if (tlsVersionSpecified !== true)
    throw new Error("No TLS version provided");
  if (serverPublicKey === void 0)
    throw new Error("No key provided");
  return serverPublicKey;
}
var init_parseServerHello = __esm({
  "src/tls/parseServerHello.ts"() {
    "use strict";
    init_array();
    init_hex();
  }
});

// src/tls/tlsRecord.ts
async function readTlsRecord(read, expectedType, maxLength = maxPlaintextRecordLength) {
  const headerLength = 5;
  const headerData = await read(headerLength);
  if (headerData === void 0)
    return;
  if (headerData.length < headerLength)
    throw new Error("TLS record header truncated");
  const header = new Bytes(headerData);
  const type = header.readUint8();
  if (type < 20 || type > 24)
    throw new Error(`Illegal TLS record type 0x${type.toString(16)}`);
  if (expectedType !== void 0 && type !== expectedType)
    throw new Error(`Unexpected TLS record type 0x${type.toString(16).padStart(2, "0")} (expected 0x${expectedType.toString(16).padStart(2, "0")})`);
  const version = header.readUint16(false);
  if ([769, 770, 771].indexOf(version) < 0)
    throw new Error(`Unsupported TLS record version 0x${version.toString(16).padStart(4, "0")}`);
  const length = header.readUint16(false);
  if (length > maxLength)
    throw new Error(`Record too long: ${length} bytes`);
  const content = await read(length);
  if (content === void 0 || content.length < length)
    throw new Error("TLS record content truncated");
  return { headerData, header, type, version, length, content };
}
async function readEncryptedTlsRecord(read, decrypter, expectedType) {
  const encryptedRecord = await readTlsRecord(read, 23 /* Application */, maxCiphertextRecordLength);
  if (encryptedRecord === void 0)
    return;
  const encryptedBytes = new Bytes(encryptedRecord.content);
  const [endEncrypted] = encryptedBytes.expectLength(encryptedBytes.remaining());
  encryptedBytes.skip(encryptedRecord.length - 16, false);
  encryptedBytes.skip(16, false);
  endEncrypted();
  const decryptedRecord = await decrypter.process(encryptedRecord.content, 16, encryptedRecord.headerData);
  let recordTypeIndex = decryptedRecord.length - 1;
  while (decryptedRecord[recordTypeIndex] === 0)
    recordTypeIndex -= 1;
  if (recordTypeIndex < 0)
    throw new Error("Decrypted message has no record type indicator (all zeroes)");
  const type = decryptedRecord[recordTypeIndex];
  const record = decryptedRecord.subarray(0, recordTypeIndex);
  if (type === 21 /* Alert */) {
    const closeNotify = record.length === 2 && record[0] === 1 && record[1] === 0;
    if (closeNotify)
      return void 0;
  }
  if (type === 22 /* Handshake */ && record[0] === 4) {
    return readEncryptedTlsRecord(read, decrypter, expectedType);
  }
  if (expectedType !== void 0 && type !== expectedType)
    throw new Error(`Unexpected TLS record type 0x${type.toString(16).padStart(2, "0")} (expected 0x${expectedType.toString(16).padStart(2, "0")})`);
  return record;
}
async function makeEncryptedTlsRecord(plaintext, encrypter, type) {
  const data = concat(plaintext, [type]);
  const headerLength = 5;
  const dataLength = data.length;
  const authTagLength = 16;
  const payloadLength = dataLength + authTagLength;
  const encryptedRecord = new Bytes(headerLength + payloadLength);
  encryptedRecord.writeUint8(23, false);
  encryptedRecord.writeUint16(771, false);
  encryptedRecord.writeUint16(payloadLength, `${payloadLength} bytes follow`);
  const [endEncryptedRecord] = encryptedRecord.expectLength(payloadLength);
  const header = encryptedRecord.array();
  const encryptedData = await encrypter.process(data, 16, header);
  encryptedRecord.writeBytes(encryptedData.subarray(0, encryptedData.length - 16));
  encryptedRecord.writeBytes(encryptedData.subarray(encryptedData.length - 16));
  endEncryptedRecord();
  return encryptedRecord.array();
}
async function makeEncryptedTlsRecords(plaintext, encrypter, type) {
  const recordCount = Math.ceil(plaintext.length / maxPlaintextRecordLength);
  const encryptedRecords = [];
  for (let i = 0; i < recordCount; i++) {
    const data = plaintext.subarray(i * maxPlaintextRecordLength, (i + 1) * maxPlaintextRecordLength);
    const encryptedRecord = await makeEncryptedTlsRecord(data, encrypter, type);
    encryptedRecords.push(encryptedRecord);
  }
  return encryptedRecords;
}
var maxPlaintextRecordLength, maxCiphertextRecordLength;
var init_tlsRecord = __esm({
  "src/tls/tlsRecord.ts"() {
    "use strict";
    init_appearance();
    init_bytes();
    init_highlights();
    init_log();
    init_hex();
    init_array();
    maxPlaintextRecordLength = 1 << 14;
    maxCiphertextRecordLength = maxPlaintextRecordLength + 1 + 255;
  }
});

// src/util/cryptoProxy.ts
var cryptoProxy_default;
var init_cryptoProxy = __esm({
  "src/util/cryptoProxy.ts"() {
    "use strict";
    cryptoProxy_default = crypto.subtle;
  }
});

// src/tls/keys.ts
async function hkdfExtract(salt, keyMaterial, hashBits) {
  const hmacKey = await cryptoProxy_default.importKey("raw", salt, { name: "HMAC", hash: { name: `SHA-${hashBits}` } }, false, ["sign"]);
  var prk = new Uint8Array(await cryptoProxy_default.sign("HMAC", hmacKey, keyMaterial));
  return prk;
}
async function hkdfExpand(key, info, length, hashBits) {
  const hashBytes = hashBits >> 3;
  const n = Math.ceil(length / hashBytes);
  const okm = new Uint8Array(n * hashBytes);
  const hmacKey = await cryptoProxy_default.importKey("raw", key, { name: "HMAC", hash: { name: `SHA-${hashBits}` } }, false, ["sign"]);
  let tPrev = new Uint8Array(0);
  for (let i = 0; i < n; i++) {
    const hmacData = concat(tPrev, info, [i + 1]);
    const tiBuffer = await cryptoProxy_default.sign("HMAC", hmacKey, hmacData);
    const ti = new Uint8Array(tiBuffer);
    okm.set(ti, hashBytes * i);
    tPrev = ti;
  }
  return okm.subarray(0, length);
}
async function hkdfExpandLabel(key, label, context, length, hashBits) {
  const labelData = txtEnc2.encode(label);
  const hkdfLabel = concat(
    [(length & 65280) >> 8, length & 255],
    [tls13_Bytes.length + labelData.length],
    tls13_Bytes,
    labelData,
    [context.length],
    context
  );
  return hkdfExpand(key, hkdfLabel, length, hashBits);
}
async function getHandshakeKeys(serverPublicKey, privateKey, hellos, hashBits, keyLength) {
  const hashBytes = hashBits >> 3;
  const zeroKey = new Uint8Array(hashBytes);
  const publicKey = await cryptoProxy_default.importKey("raw", serverPublicKey, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecretBuffer = await cryptoProxy_default.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const sharedSecret = new Uint8Array(sharedSecretBuffer);
  const hellosHashBuffer = await cryptoProxy_default.digest("SHA-256", hellos);
  const hellosHash = new Uint8Array(hellosHashBuffer);
  const earlySecret = await hkdfExtract(new Uint8Array(1), zeroKey, hashBits);
  const emptyHashBuffer = await cryptoProxy_default.digest(`SHA-${hashBits}`, new Uint8Array(0));
  const emptyHash = new Uint8Array(emptyHashBuffer);
  const derivedSecret = await hkdfExpandLabel(earlySecret, "derived", emptyHash, hashBytes, hashBits);
  const handshakeSecret = await hkdfExtract(derivedSecret, sharedSecret, hashBits);
  const clientSecret = await hkdfExpandLabel(handshakeSecret, "c hs traffic", hellosHash, hashBytes, hashBits);
  const serverSecret = await hkdfExpandLabel(handshakeSecret, "s hs traffic", hellosHash, hashBytes, hashBits);
  const clientHandshakeKey = await hkdfExpandLabel(clientSecret, "key", new Uint8Array(0), keyLength, hashBits);
  const serverHandshakeKey = await hkdfExpandLabel(serverSecret, "key", new Uint8Array(0), keyLength, hashBits);
  const clientHandshakeIV = await hkdfExpandLabel(clientSecret, "iv", new Uint8Array(0), 12, hashBits);
  const serverHandshakeIV = await hkdfExpandLabel(serverSecret, "iv", new Uint8Array(0), 12, hashBits);
  return { serverHandshakeKey, serverHandshakeIV, clientHandshakeKey, clientHandshakeIV, handshakeSecret, clientSecret, serverSecret };
}
async function getApplicationKeys(handshakeSecret, handshakeHash, hashBits, keyLength) {
  const hashBytes = hashBits >> 3;
  const zeroKey = new Uint8Array(hashBytes);
  const emptyHashBuffer = await cryptoProxy_default.digest(`SHA-${hashBits}`, new Uint8Array(0));
  const emptyHash = new Uint8Array(emptyHashBuffer);
  const derivedSecret = await hkdfExpandLabel(handshakeSecret, "derived", emptyHash, hashBytes, hashBits);
  const masterSecret = await hkdfExtract(derivedSecret, zeroKey, hashBits);
  const clientSecret = await hkdfExpandLabel(masterSecret, "c ap traffic", handshakeHash, hashBytes, hashBits);
  const serverSecret = await hkdfExpandLabel(masterSecret, "s ap traffic", handshakeHash, hashBytes, hashBits);
  const clientApplicationKey = await hkdfExpandLabel(clientSecret, "key", new Uint8Array(0), keyLength, hashBits);
  const serverApplicationKey = await hkdfExpandLabel(serverSecret, "key", new Uint8Array(0), keyLength, hashBits);
  const clientApplicationIV = await hkdfExpandLabel(clientSecret, "iv", new Uint8Array(0), 12, hashBits);
  const serverApplicationIV = await hkdfExpandLabel(serverSecret, "iv", new Uint8Array(0), 12, hashBits);
  return { serverApplicationKey, serverApplicationIV, clientApplicationKey, clientApplicationIV };
}
var txtEnc2, tls13_Bytes;
var init_keys = __esm({
  "src/tls/keys.ts"() {
    "use strict";
    init_hex();
    init_array();
    init_log();
    init_highlights();
    init_cryptoProxy();
    txtEnc2 = new TextEncoder();
    tls13_Bytes = txtEnc2.encode("tls13 ");
  }
});

// src/tls/aesgcm.ts
var maxRecords, Crypter;
var init_aesgcm = __esm({
  "src/tls/aesgcm.ts"() {
    "use strict";
    init_cryptoProxy();
    maxRecords = 2 ** 31 - 1;
    Crypter = class {
      mode;
      key;
      initialIv;
      ivLength;
      currentIv;
      currentIvDataView;
      initialIvLast32;
      recordsDecrypted = 0;
      constructor(mode, key, initialIv) {
        this.mode = mode;
        this.key = key;
        this.initialIv = initialIv;
        this.ivLength = initialIv.length;
        this.currentIv = initialIv.slice();
        this.currentIvDataView = new DataView(this.currentIv.buffer, this.currentIv.byteOffset, this.currentIv.byteLength);
        this.initialIvLast32 = this.currentIvDataView.getUint32(this.ivLength - 4);
      }
      async process(data, authTagLength, additionalData) {
        if (this.recordsDecrypted === maxRecords)
          throw new Error("Cannot encrypt/decrypt any more records");
        const currentIvLast32 = this.initialIvLast32 ^ this.recordsDecrypted;
        this.currentIvDataView.setUint32(this.ivLength - 4, currentIvLast32);
        this.recordsDecrypted += 1;
        const authTagBits = authTagLength << 3;
        const algorithm = { name: "AES-GCM", iv: this.currentIv, tagLength: authTagBits, additionalData };
        const resultBuffer = await cryptoProxy_default[this.mode](algorithm, this.key, data);
        const result = new Uint8Array(resultBuffer);
        return result;
      }
    };
  }
});

// src/util/base64.ts
function charCodeMap(charCode) {
  return charCode > 64 && charCode < 91 ? charCode - 65 : charCode > 96 && charCode < 123 ? charCode - 71 : charCode > 47 && charCode < 58 ? charCode + 4 : charCode === 43 ? 62 : charCode === 47 ? 63 : charCode === 61 ? 64 : void 0;
}
function base64Decode(input) {
  const len = input.length;
  let inputIdx = 0, outputIdx = 0;
  let enc1 = 64, enc2 = 64, enc3 = 64, enc4 = 64;
  const output = new Uint8Array(len * 0.75);
  while (inputIdx < len) {
    enc1 = charCodeMap(input.charCodeAt(inputIdx++));
    enc2 = charCodeMap(input.charCodeAt(inputIdx++));
    enc3 = charCodeMap(input.charCodeAt(inputIdx++));
    enc4 = charCodeMap(input.charCodeAt(inputIdx++));
    output[outputIdx++] = enc1 << 2 | enc2 >> 4;
    output[outputIdx++] = (enc2 & 15) << 4 | enc3 >> 2;
    output[outputIdx++] = (enc3 & 3) << 6 | enc4;
  }
  const excessLength = enc2 === 64 ? 0 : enc3 === 64 ? 2 : enc4 === 64 ? 1 : 0;
  return output.subarray(0, outputIdx - excessLength);
}
var init_base64 = __esm({
  "src/util/base64.ts"() {
    "use strict";
  }
});

// src/util/asn1bytes.ts
var ASN1Bytes;
var init_asn1bytes = __esm({
  "src/util/asn1bytes.ts"() {
    "use strict";
    init_bytes();
    init_hex();
    ASN1Bytes = class extends Bytes {
      readASN1Length(comment) {
        const byte1 = this.readUint8();
        if (byte1 < 128) {
          return byte1;
        }
        const lengthBytes = byte1 & 127;
        const fullComment = false;
        if (lengthBytes === 1)
          return this.readUint8(fullComment);
        if (lengthBytes === 2)
          return this.readUint16(fullComment);
        if (lengthBytes === 3)
          return this.readUint24(fullComment);
        if (lengthBytes === 4)
          return this.readUint32(fullComment);
        throw new Error(`ASN.1 length fields are only supported up to 4 bytes (this one is ${lengthBytes} bytes)`);
      }
      expectASN1Length(comment) {
        const length = this.readASN1Length(comment);
        return this.expectLength(length);
      }
      readASN1OID() {
        const [endOID, OIDRemaining] = this.expectASN1Length(false);
        const byte1 = this.readUint8();
        let oid = `${Math.floor(byte1 / 40)}.${byte1 % 40}`;
        while (OIDRemaining() > 0) {
          let value = 0;
          while (true) {
            const nextByte = this.readUint8();
            value <<= 7;
            value += nextByte & 127;
            if (nextByte < 128)
              break;
          }
          oid += `.${value}`;
        }
        endOID();
        return oid;
      }
      readASN1Boolean() {
        const [endBoolean, booleanRemaining] = this.expectASN1Length(false);
        const length = booleanRemaining();
        if (length !== 1)
          throw new Error(`Boolean has weird length: ${length}`);
        const byte = this.readUint8();
        let result;
        if (byte === 255)
          result = true;
        else if (byte === 0)
          result = false;
        else
          throw new Error(`Boolean has weird value: 0x${hexFromU8([byte])}`);
        endBoolean();
        return result;
      }
      readASN1UTCTime() {
        const [endTime, timeRemaining] = this.expectASN1Length(false);
        const timeStr = this.readUTF8String(timeRemaining());
        const parts = timeStr.match(/^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)Z$/);
        if (!parts)
          throw new Error("Unrecognised ASN.1 UTC time format");
        const [, yr2dstr, mth, dy, hr, min, sec] = parts;
        const yr2d = parseInt(yr2dstr, 10);
        const yr = yr2d + (yr2d >= 50 ? 1900 : 2e3);
        const time = new Date(`${yr}-${mth}-${dy}T${hr}:${min}:${sec}Z`);
        endTime();
        return time;
      }
      readASN1BitString() {
        const [endBitString, bitStringRemaining] = this.expectASN1Length(false);
        const rightPadBits = this.readUint8(false);
        const bytesLength = bitStringRemaining();
        const bitString = this.readBytes(bytesLength);
        if (rightPadBits > 7)
          throw new Error(`Invalid right pad value: ${rightPadBits}`);
        if (rightPadBits > 0) {
          const leftPadNext = 8 - rightPadBits;
          for (let i = bytesLength - 1; i > 0; i--) {
            bitString[i] = 255 & bitString[i - 1] << leftPadNext | bitString[i] >>> rightPadBits;
          }
          bitString[0] = bitString[0] >>> rightPadBits;
        }
        endBitString();
        return bitString;
      }
    };
  }
});

// src/tls/certUtils.ts
function intFromBitString(bs) {
  const { length } = bs;
  if (length > 4)
    throw new Error(`Bit string length ${length} would overflow JS bit operators`);
  let result = 0;
  let leftShift = 0;
  for (let i = bs.length - 1; i >= 0; i--) {
    result |= bs[i] << leftShift;
    leftShift += 8;
  }
  return result;
}
function readSeqOfSetOfSeq(cb, seqType) {
  const result = {};
  cb.expectUint8(constructedUniversalTypeSequence, false);
  const [endSeq, seqRemaining] = cb.expectASN1Length(false);
  while (seqRemaining() > 0) {
    cb.expectUint8(constructedUniversalTypeSet, false);
    const [endItemSet] = cb.expectASN1Length(false);
    cb.expectUint8(constructedUniversalTypeSequence, false);
    const [endItemSeq] = cb.expectASN1Length(false);
    cb.expectUint8(universalTypeOID, false);
    const itemOID = cb.readASN1OID();
    const itemName = DNOIDMap[itemOID] ?? itemOID;
    const valueType = cb.readUint8();
    if (valueType === universalTypePrintableString) {
    } else if (valueType === universalTypeUTF8String) {
    } else {
      throw new Error(`Unexpected item type in certificate ${seqType}: 0x${hexFromU8([valueType])}`);
    }
    const [endItemString, itemStringRemaining] = cb.expectASN1Length(false);
    const itemValue = cb.readUTF8String(itemStringRemaining());
    endItemString();
    endItemSeq();
    endItemSet();
    if (result[itemName] !== void 0)
      throw new Error(`Duplicate OID ${itemName} in certificate ${seqType}`);
    result[itemName] = itemValue;
  }
  endSeq();
  return result;
}
function readNamesSeq(cb, typeUnionBits = 0) {
  const names = [];
  const [endNamesSeq, namesSeqRemaining] = cb.expectASN1Length(false);
  while (namesSeqRemaining() > 0) {
    const type = cb.readUint8(false);
    const [endName, nameRemaining] = cb.expectASN1Length(false);
    let name;
    if (type === (typeUnionBits | 2 /* dNSName */)) {
      name = cb.readUTF8String(nameRemaining());
    } else {
      name = cb.readBytes(nameRemaining());
    }
    names.push({ name, type });
    endName();
  }
  endNamesSeq();
  return names;
}
function algorithmWithOID(oid) {
  const algo = {
    "1.2.840.113549.1.1.1": {
      name: "RSAES-PKCS1-v1_5"
    },
    "1.2.840.113549.1.1.5": {
      name: "RSASSA-PKCS1-v1_5",
      hash: {
        name: "SHA-1"
      }
    },
    "1.2.840.113549.1.1.11": {
      name: "RSASSA-PKCS1-v1_5",
      hash: {
        name: "SHA-256"
      }
    },
    "1.2.840.113549.1.1.12": {
      name: "RSASSA-PKCS1-v1_5",
      hash: {
        name: "SHA-384"
      }
    },
    "1.2.840.113549.1.1.13": {
      name: "RSASSA-PKCS1-v1_5",
      hash: {
        name: "SHA-512"
      }
    },
    "1.2.840.113549.1.1.10": {
      name: "RSA-PSS"
    },
    "1.2.840.113549.1.1.7": {
      name: "RSA-OAEP"
    },
    "1.2.840.10045.2.1": {
      name: "ECDSA",
      hash: {
        name: "SHA-1"
      }
    },
    "1.2.840.10045.4.1": {
      name: "ECDSA",
      hash: {
        name: "SHA-1"
      }
    },
    "1.2.840.10045.4.3.2": {
      name: "ECDSA",
      hash: {
        name: "SHA-256"
      }
    },
    "1.2.840.10045.4.3.3": {
      name: "ECDSA",
      hash: {
        name: "SHA-384"
      }
    },
    "1.2.840.10045.4.3.4": {
      name: "ECDSA",
      hash: {
        name: "SHA-512"
      }
    },
    "1.3.133.16.840.63.0.2": {
      name: "ECDH",
      kdf: "SHA-1"
    },
    "1.3.132.1.11.1": {
      name: "ECDH",
      kdf: "SHA-256"
    },
    "1.3.132.1.11.2": {
      name: "ECDH",
      kdf: "SHA-384"
    },
    "1.3.132.1.11.3": {
      name: "ECDH",
      kdf: "SHA-512"
    },
    "2.16.840.1.101.3.4.1.2": {
      name: "AES-CBC",
      length: 128
    },
    "2.16.840.1.101.3.4.1.22": {
      name: "AES-CBC",
      length: 192
    },
    "2.16.840.1.101.3.4.1.42": {
      name: "AES-CBC",
      length: 256
    },
    "2.16.840.1.101.3.4.1.6": {
      name: "AES-GCM",
      length: 128
    },
    "2.16.840.1.101.3.4.1.26": {
      name: "AES-GCM",
      length: 192
    },
    "2.16.840.1.101.3.4.1.46": {
      name: "AES-GCM",
      length: 256
    },
    "2.16.840.1.101.3.4.1.4": {
      name: "AES-CFB",
      length: 128
    },
    "2.16.840.1.101.3.4.1.24": {
      name: "AES-CFB",
      length: 192
    },
    "2.16.840.1.101.3.4.1.44": {
      name: "AES-CFB",
      length: 256
    },
    "2.16.840.1.101.3.4.1.5": {
      name: "AES-KW",
      length: 128
    },
    "2.16.840.1.101.3.4.1.25": {
      name: "AES-KW",
      length: 192
    },
    "2.16.840.1.101.3.4.1.45": {
      name: "AES-KW",
      length: 256
    },
    "1.2.840.113549.2.7": {
      name: "HMAC",
      hash: {
        name: "SHA-1"
      }
    },
    "1.2.840.113549.2.9": {
      name: "HMAC",
      hash: {
        name: "SHA-256"
      }
    },
    "1.2.840.113549.2.10": {
      name: "HMAC",
      hash: {
        name: "SHA-384"
      }
    },
    "1.2.840.113549.2.11": {
      name: "HMAC",
      hash: {
        name: "SHA-512"
      }
    },
    "1.2.840.113549.1.9.16.3.5": {
      name: "DH"
    },
    "1.3.14.3.2.26": {
      name: "SHA-1"
    },
    "2.16.840.1.101.3.4.2.1": {
      name: "SHA-256"
    },
    "2.16.840.1.101.3.4.2.2": {
      name: "SHA-384"
    },
    "2.16.840.1.101.3.4.2.3": {
      name: "SHA-512"
    },
    "1.2.840.113549.1.5.12": {
      name: "PBKDF2"
    },
    "1.2.840.10045.3.1.7": {
      name: "P-256"
    },
    "1.3.132.0.34": {
      name: "P-384"
    },
    "1.3.132.0.35": {
      name: "P-521"
    }
  }[oid];
  if (algo === void 0)
    throw new Error(`Unsupported algorithm identifier: ${oid}`);
  return algo;
}
function _descriptionForAlgorithm(algo, desc = []) {
  Object.values(algo).forEach((value) => {
    if (typeof value === "string")
      desc = [...desc, value];
    else
      desc = _descriptionForAlgorithm(value, desc);
  });
  return desc;
}
function descriptionForAlgorithm(algo) {
  return _descriptionForAlgorithm(algo).join(" / ");
}
var universalTypeBoolean, universalTypeInteger, constructedUniversalTypeSequence, constructedUniversalTypeSet, universalTypeOID, universalTypePrintableString, universalTypeUTF8String, universalTypeUTCTime, universalTypeNull, universalTypeOctetString, universalTypeBitString, constructedContextSpecificType, contextSpecificType, DNOIDMap;
var init_certUtils = __esm({
  "src/tls/certUtils.ts"() {
    "use strict";
    init_hex();
    universalTypeBoolean = 1;
    universalTypeInteger = 2;
    constructedUniversalTypeSequence = 48;
    constructedUniversalTypeSet = 49;
    universalTypeOID = 6;
    universalTypePrintableString = 19;
    universalTypeUTF8String = 12;
    universalTypeUTCTime = 23;
    universalTypeNull = 5;
    universalTypeOctetString = 4;
    universalTypeBitString = 3;
    constructedContextSpecificType = 163;
    contextSpecificType = 128;
    DNOIDMap = {
      "2.5.4.6": "C",
      "2.5.4.10": "O",
      "2.5.4.11": "OU",
      "2.5.4.3": "CN",
      "2.5.4.7": "L",
      "2.5.4.8": "ST",
      "2.5.4.12": "T",
      "2.5.4.42": "GN",
      "2.5.4.43": "I",
      "2.5.4.4": "SN",
      "1.2.840.113549.1.9.1": "E-mail"
    };
  }
});

// src/tls/cert.ts
var allKeyUsages, Cert, TrustedCert;
var init_cert = __esm({
  "src/tls/cert.ts"() {
    "use strict";
    init_base64();
    init_asn1bytes();
    init_certUtils();
    init_hex();
    allKeyUsages = [
      "digitalSignature",
      "nonRepudiation",
      "keyEncipherment",
      "dataEncipherment",
      "keyAgreement",
      "keyCertSign",
      "cRLSign",
      "encipherOnly",
      "decipherOnly"
    ];
    Cert = class {
      serialNumber;
      algorithm;
      issuer;
      validityPeriod;
      subject;
      publicKey;
      signature;
      keyUsage;
      subjectAltNames;
      extKeyUsage;
      authorityKeyIdentifier;
      subjectKeyIdentifier;
      basicConstraints;
      signedData;
      constructor(certData) {
        const cb = certData instanceof ASN1Bytes ? certData : new ASN1Bytes(certData);
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endCertSeq] = cb.expectASN1Length(false);
        const tbsCertStartOffset = cb.offset;
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endCertInfoSeq] = cb.expectASN1Length(false);
        cb.expectBytes([160, 3, 2, 1, 2], false);
        cb.expectUint8(universalTypeInteger, false);
        const [endSerialNumber, serialNumberRemaining] = cb.expectASN1Length(false);
        this.serialNumber = cb.subarray(serialNumberRemaining());
        endSerialNumber();
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endAlgo, algoRemaining] = cb.expectASN1Length(false);
        cb.expectUint8(universalTypeOID, false);
        this.algorithm = cb.readASN1OID();
        if (algoRemaining() > 0) {
          cb.expectUint8(universalTypeNull, false);
          cb.expectUint8(0, false);
        }
        endAlgo();
        this.issuer = readSeqOfSetOfSeq(cb, "issuer");
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endValiditySeq] = cb.expectASN1Length(false);
        cb.expectUint8(universalTypeUTCTime, false);
        const notBefore = cb.readASN1UTCTime();
        cb.expectUint8(universalTypeUTCTime, false);
        const notAfter = cb.readASN1UTCTime();
        this.validityPeriod = { notBefore, notAfter };
        endValiditySeq();
        this.subject = readSeqOfSetOfSeq(cb, "subject");
        const publicKeyStartOffset = cb.offset;
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endPublicKeySeq] = cb.expectASN1Length(false);
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endKeyOID, keyOIDRemaining] = cb.expectASN1Length(false);
        const publicKeyOIDs = [];
        while (keyOIDRemaining() > 0) {
          const keyParamRecordType = cb.readUint8();
          if (keyParamRecordType === universalTypeOID) {
            const keyOID = cb.readASN1OID();
            publicKeyOIDs.push(keyOID);
          } else if (keyParamRecordType === universalTypeNull) {
            cb.expectUint8(0, false);
          }
        }
        endKeyOID();
        cb.expectUint8(universalTypeBitString, false);
        const publicKeyData = cb.readASN1BitString();
        this.publicKey = { identifiers: publicKeyOIDs, data: publicKeyData, all: cb.data.subarray(publicKeyStartOffset, cb.offset) };
        endPublicKeySeq();
        cb.expectUint8(constructedContextSpecificType, false);
        const [endExtsData] = cb.expectASN1Length();
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endExts, extsRemaining] = cb.expectASN1Length(false);
        while (extsRemaining() > 0) {
          cb.expectUint8(constructedUniversalTypeSequence, false);
          const [endExt, extRemaining] = cb.expectASN1Length();
          cb.expectUint8(universalTypeOID, false);
          const extOID = cb.readASN1OID();
          if (extOID === "2.5.29.17") {
            cb.expectUint8(universalTypeOctetString, false);
            const [endSanDerDoc] = cb.expectASN1Length(false);
            cb.expectUint8(constructedUniversalTypeSequence, false);
            const allSubjectAltNames = readNamesSeq(cb, contextSpecificType);
            this.subjectAltNames = allSubjectAltNames.filter((san) => san.type === (2 /* dNSName */ | contextSpecificType)).map((san) => san.name);
            endSanDerDoc();
          } else if (extOID === "2.5.29.15") {
            cb.expectUint8(universalTypeBoolean, false);
            const keyUsageCritical = cb.readASN1Boolean();
            cb.expectUint8(universalTypeOctetString, false);
            const [endKeyUsageDer] = cb.expectASN1Length(false);
            cb.expectUint8(universalTypeBitString, false);
            const keyUsageBitStr = cb.readASN1BitString();
            const keyUsageBitmask = intFromBitString(keyUsageBitStr);
            const keyUsageNames = new Set(allKeyUsages.filter((u, i) => keyUsageBitmask & 1 << i));
            endKeyUsageDer();
            this.keyUsage = {
              critical: keyUsageCritical,
              usages: keyUsageNames
            };
          } else if (extOID === "2.5.29.37") {
            this.extKeyUsage = {};
            cb.expectUint8(universalTypeOctetString, false);
            const [endExtKeyUsageDer] = cb.expectASN1Length(false);
            cb.expectUint8(constructedUniversalTypeSequence, false);
            const [endExtKeyUsage, extKeyUsageRemaining] = cb.expectASN1Length(false);
            while (extKeyUsageRemaining() > 0) {
              cb.expectUint8(universalTypeOID, false);
              const extKeyUsageOID = cb.readASN1OID();
              if (extKeyUsageOID === "1.3.6.1.5.5.7.3.1")
                this.extKeyUsage.serverTls = true;
              if (extKeyUsageOID === "1.3.6.1.5.5.7.3.2")
                this.extKeyUsage.clientTls = true;
            }
            endExtKeyUsage();
            endExtKeyUsageDer();
          } else if (extOID === "2.5.29.35") {
            cb.expectUint8(universalTypeOctetString, false);
            const [endAuthKeyIdDer] = cb.expectASN1Length(false);
            cb.expectUint8(constructedUniversalTypeSequence, false);
            const [endAuthKeyIdSeq, authKeyIdSeqRemaining] = cb.expectASN1Length(false);
            while (authKeyIdSeqRemaining() > 0) {
              const authKeyIdDatumType = cb.readUint8();
              if (authKeyIdDatumType === (contextSpecificType | 0)) {
                const [endAuthKeyId, authKeyIdRemaining] = cb.expectASN1Length(false);
                this.authorityKeyIdentifier = cb.readBytes(authKeyIdRemaining());
                endAuthKeyId();
              } else if (authKeyIdDatumType === (contextSpecificType | 1) || authKeyIdDatumType === (contextSpecificType | 2)) {
                const [endAuthKeyIdExtra, authKeyIdExtraRemaining] = cb.expectASN1Length(false);
                cb.skip(authKeyIdExtraRemaining(), false);
                endAuthKeyIdExtra();
              } else {
                throw new Error("Unexpected data type in authorityKeyIdentifier certificate extension");
              }
            }
            endAuthKeyIdSeq();
            endAuthKeyIdDer();
          } else if (extOID === "2.5.29.14") {
            cb.expectUint8(universalTypeOctetString, false);
            const [endSubjectKeyIdDer] = cb.expectASN1Length(false);
            cb.expectUint8(universalTypeOctetString, false);
            const [endSubjectKeyId, subjectKeyIdRemaining] = cb.expectASN1Length(false);
            this.subjectKeyIdentifier = cb.readBytes(subjectKeyIdRemaining());
            endSubjectKeyId();
            endSubjectKeyIdDer();
          } else if (extOID === "2.5.29.19") {
            let basicConstraintsCritical;
            let bcNextType = cb.readUint8();
            if (bcNextType === universalTypeBoolean) {
              basicConstraintsCritical = cb.readASN1Boolean();
              bcNextType = cb.readUint8();
            }
            if (bcNextType !== universalTypeOctetString)
              throw new Error("Unexpected type in certificate basic constraints");
            const [endBasicConstraintsDer] = cb.expectASN1Length(false);
            cb.expectUint8(constructedUniversalTypeSequence, false);
            const [endConstraintsSeq, constraintsSeqRemaining] = cb.expectASN1Length();
            let basicConstraintsCa = void 0;
            if (constraintsSeqRemaining() > 0) {
              cb.expectUint8(universalTypeBoolean, false);
              basicConstraintsCa = cb.readASN1Boolean();
            }
            let basicConstraintsPathLength;
            if (constraintsSeqRemaining() > 0) {
              cb.expectUint8(universalTypeInteger, false);
              const maxPathLengthLength = cb.readASN1Length(false);
              basicConstraintsPathLength = maxPathLengthLength === 1 ? cb.readUint8() : maxPathLengthLength === 2 ? cb.readUint16() : maxPathLengthLength === 3 ? cb.readUint24() : void 0;
              if (basicConstraintsPathLength === void 0)
                throw new Error("Too many bytes in max path length in certificate basicConstraints");
            }
            endConstraintsSeq();
            endBasicConstraintsDer();
            this.basicConstraints = {
              critical: basicConstraintsCritical,
              ca: basicConstraintsCa,
              pathLength: basicConstraintsPathLength
            };
          } else {
            cb.skip(extRemaining(), false);
          }
          endExt();
        }
        endExts();
        endExtsData();
        endCertInfoSeq();
        this.signedData = cb.data.subarray(tbsCertStartOffset, cb.offset);
        cb.expectUint8(constructedUniversalTypeSequence, false);
        const [endSigAlgo, sigAlgoRemaining] = cb.expectASN1Length(false);
        cb.expectUint8(universalTypeOID, false);
        const sigAlgoOID = cb.readASN1OID();
        if (sigAlgoRemaining() > 0) {
          cb.expectUint8(universalTypeNull, false);
          cb.expectUint8(0, false);
        }
        endSigAlgo();
        if (sigAlgoOID !== this.algorithm)
          throw new Error(`Certificate specifies different signature algorithms inside (${this.algorithm}) and out (${sigAlgoOID})`);
        cb.expectUint8(universalTypeBitString, false);
        this.signature = cb.readASN1BitString();
        endCertSeq();
      }
      static fromPEM(pem) {
        const tag = "[A-Z0-9 ]+";
        const pattern = new RegExp(`-{5}BEGIN ${tag}-{5}([a-zA-Z0-9=+\\/\\n\\r]+)-{5}END ${tag}-{5}`, "g");
        const res = [];
        let matches = null;
        while (matches = pattern.exec(pem)) {
          const base64 = matches[1].replace(/[\r\n]/g, "");
          const binary = base64Decode(base64);
          const cert = new this(binary);
          res.push(cert);
        }
        return res;
      }
      subjectAltNameMatchingHost(host) {
        const twoDotRegex = /[.][^.]+[.][^.]+$/;
        return (this.subjectAltNames ?? []).find((cert) => {
          let certName = cert;
          let hostName = host;
          if (twoDotRegex.test(host) && twoDotRegex.test(certName) && certName.startsWith("*.")) {
            certName = certName.slice(1);
            hostName = hostName.slice(hostName.indexOf("."));
          }
          if (certName === hostName)
            return true;
        });
      }
      isValidAtMoment(moment = new Date()) {
        return moment >= this.validityPeriod.notBefore && moment <= this.validityPeriod.notAfter;
      }
      description() {
        return "subject: " + Object.entries(this.subject).map((x) => x.join("=")).join(", ") + (this.subjectAltNames ? "\nsubject alt names: " + this.subjectAltNames.join(", ") : "") + (this.subjectKeyIdentifier ? `
subject key id: ${hexFromU8(this.subjectKeyIdentifier, " ")}` : "") + "\nissuer: " + Object.entries(this.issuer).map((x) => x.join("=")).join(", ") + (this.authorityKeyIdentifier ? `
authority key id: ${hexFromU8(this.authorityKeyIdentifier, " ")}` : "") + "\nvalidity: " + this.validityPeriod.notBefore.toISOString() + " \u2013 " + this.validityPeriod.notAfter.toISOString() + ` (${this.isValidAtMoment() ? "currently valid" : "not valid"})` + (this.keyUsage ? `
key usage (${this.keyUsage.critical ? "critical" : "non-critical"}): ` + [...this.keyUsage.usages].join(", ") : "") + (this.extKeyUsage ? `
extended key usage: TLS server \u2014\xA0${this.extKeyUsage.serverTls}, TLS client \u2014\xA0${this.extKeyUsage.clientTls}` : "") + (this.basicConstraints ? `
basic constraints (${this.basicConstraints.critical ? "critical" : "non-critical"}): CA \u2014\xA0${this.basicConstraints.ca}, path length \u2014 ${this.basicConstraints.pathLength}` : "") + "\nsignature algorithm: " + descriptionForAlgorithm(algorithmWithOID(this.algorithm));
      }
      toJSON() {
        return {
          serialNumber: [...this.serialNumber],
          algorithm: this.algorithm,
          issuer: this.issuer,
          validityPeriod: {
            notBefore: this.validityPeriod.notBefore.toISOString(),
            notAfter: this.validityPeriod.notAfter.toISOString()
          },
          subject: this.subject,
          publicKey: {
            identifiers: this.publicKey.identifiers,
            data: [...this.publicKey.data],
            all: [...this.publicKey.all]
          },
          signature: [...this.signature],
          keyUsage: {
            critical: this.keyUsage?.critical,
            usages: [...this.keyUsage?.usages ?? []]
          },
          subjectAltNames: this.subjectAltNames,
          extKeyUsage: this.extKeyUsage,
          authorityKeyIdentifier: this.authorityKeyIdentifier && [...this.authorityKeyIdentifier],
          subjectKeyIdentifier: this.subjectKeyIdentifier && [...this.subjectKeyIdentifier],
          basicConstraints: this.basicConstraints,
          signedData: [...this.signedData]
        };
      }
    };
    TrustedCert = class extends Cert {
    };
  }
});

// src/tls/ecdsa.ts
async function ecdsaVerify(sb, publicKey, signedData, namedCurve, hash) {
  sb.expectUint8(constructedUniversalTypeSequence, false);
  const [endSigDer] = sb.expectASN1Length(false);
  sb.expectUint8(universalTypeInteger, false);
  const [endSigRBytes, sigRBytesRemaining] = sb.expectASN1Length(false);
  let sigR = sb.readBytes(sigRBytesRemaining());
  endSigRBytes();
  sb.expectUint8(universalTypeInteger, false);
  const [endSigSBytes, sigSBytesRemaining] = sb.expectASN1Length(false);
  let sigS = sb.readBytes(sigSBytesRemaining());
  endSigSBytes();
  endSigDer();
  const clampToLength = (x, clampLength) => x.length > clampLength ? x.subarray(x.length - clampLength) : x.length < clampLength ? concat(new Uint8Array(clampLength - x.length), x) : x;
  const intLength = namedCurve === "P-256" ? 32 : 48;
  const signature = concat(clampToLength(sigR, intLength), clampToLength(sigS, intLength));
  const signatureKey = await cryptoProxy_default.importKey("spki", publicKey, { name: "ECDSA", namedCurve }, false, ["verify"]);
  const certVerifyResult = await cryptoProxy_default.verify({ name: "ECDSA", hash }, signatureKey, signature, signedData);
  if (certVerifyResult !== true)
    throw new Error("ECDSA-SECP256R1-SHA256 certificate verify failed");
}
var init_ecdsa = __esm({
  "src/tls/ecdsa.ts"() {
    "use strict";
    init_log();
    init_array();
    init_certUtils();
    init_cryptoProxy();
  }
});

// src/tls/verifyCerts.ts
async function verifyCerts(host, certs, rootCerts) {
  for (const cert of certs)
    ;
  const userCert = certs[0];
  const matchingSubjectAltName = userCert.subjectAltNameMatchingHost(host);
  if (matchingSubjectAltName === void 0)
    throw new Error(`No matching subjectAltName for ${host}`);
  const validNow = userCert.isValidAtMoment();
  if (!validNow)
    throw new Error("End-user certificate is not valid now");
  if (!userCert.extKeyUsage?.serverTls)
    throw new Error("End-user certificate has no TLS server extKeyUsage");
  let verifiedToTrustedRoot = false;
  for (const cert of rootCerts)
    ;
  for (let i = 0, len = certs.length; i < len; i++) {
    const subjectCert = certs[i];
    const subjectAuthKeyId = subjectCert.authorityKeyIdentifier;
    if (subjectAuthKeyId === void 0)
      throw new Error("Certificates without an authorityKeyIdentifier are not supported");
    let signingCert = rootCerts.find((cert) => cert.subjectKeyIdentifier !== void 0 && equal(cert.subjectKeyIdentifier, subjectAuthKeyId));
    if (signingCert === void 0)
      signingCert = certs[i + 1];
    if (signingCert === void 0)
      throw new Error("Ran out of certificates before reaching trusted root");
    const signingCertIsTrustedRoot = signingCert instanceof TrustedCert;
    if (signingCert.isValidAtMoment() !== true)
      throw new Error("Signing certificate is not valid now");
    if (signingCert.keyUsage?.usages.has("digitalSignature") !== true)
      throw new Error("Signing certificate keyUsage does not include digital signatures");
    if (signingCert.basicConstraints?.ca !== true)
      throw new Error("Signing certificate basicConstraints do not indicate a CA certificate");
    const { pathLength } = signingCert.basicConstraints;
    if (pathLength !== void 0 && pathLength < i)
      throw new Error("Exceeded certificate path length");
    if (subjectCert.algorithm === "1.2.840.10045.4.3.2" || subjectCert.algorithm === "1.2.840.10045.4.3.3") {
      const hash = subjectCert.algorithm === "1.2.840.10045.4.3.2" ? "SHA-256" : "SHA-384";
      const signingKeyOIDs = signingCert.publicKey.identifiers;
      const namedCurve = signingKeyOIDs.includes("1.2.840.10045.3.1.7") ? "P-256" : signingKeyOIDs.includes("1.3.132.0.34") ? "P-384" : void 0;
      if (namedCurve === void 0)
        throw new Error("Unsupported signing key curve");
      const sb = new ASN1Bytes(subjectCert.signature);
      await ecdsaVerify(sb, signingCert.publicKey.all, subjectCert.signedData, namedCurve, hash);
    } else if (subjectCert.algorithm === "1.2.840.113549.1.1.11" || subjectCert.algorithm === "1.2.840.113549.1.1.12") {
      const hash = subjectCert.algorithm === "1.2.840.113549.1.1.11" ? "SHA-256" : "SHA-384";
      const signatureKey = await cryptoProxy_default.importKey("spki", signingCert.publicKey.all, { name: "RSASSA-PKCS1-v1_5", hash }, false, ["verify"]);
      const certVerifyResult = await cryptoProxy_default.verify({ name: "RSASSA-PKCS1-v1_5" }, signatureKey, subjectCert.signature, subjectCert.signedData);
      if (certVerifyResult !== true)
        throw new Error("RSASSA_PKCS1-v1_5-SHA256 certificate verify failed");
    } else {
      throw new Error("Unsupported signing algorithm");
    }
    if (signingCertIsTrustedRoot) {
      verifiedToTrustedRoot = true;
      break;
    }
  }
  return verifiedToTrustedRoot;
}
var init_verifyCerts = __esm({
  "src/tls/verifyCerts.ts"() {
    "use strict";
    init_cert();
    init_hex();
    init_array();
    init_appearance();
    init_highlights();
    init_log();
    init_asn1bytes();
    init_ecdsa();
    init_cryptoProxy();
  }
});

// src/tls/readEncryptedHandshake.ts
async function readEncryptedHandshake(host, readHandshakeRecord, serverSecret, hellos, rootCerts) {
  const hs = new ASN1Bytes(await readHandshakeRecord());
  hs.expectUint8(8, false);
  const [eeMessageEnd] = hs.expectLengthUint24();
  const [extEnd, extRemaining] = hs.expectLengthUint16(false);
  while (extRemaining() > 0) {
    const extType = hs.readUint16(false);
    if (extType === 0) {
      hs.expectUint16(0, false);
    } else if (extType === 10) {
      const [endGroups, groupsRemaining] = hs.expectLengthUint16("groups data");
      hs.skip(groupsRemaining(), false);
      endGroups();
    } else {
      throw new Error(`Unsupported server encrypted extension type 0x${hexFromU8([extType]).padStart(4, "0")}`);
    }
  }
  extEnd();
  eeMessageEnd();
  if (hs.remaining() === 0)
    hs.extend(await readHandshakeRecord());
  let clientCertRequested = false;
  let certMsgType = hs.readUint8();
  if (certMsgType === 13) {
    clientCertRequested = true;
    const [endCertReq] = hs.expectLengthUint24("certificate request data");
    hs.expectUint8(0, false);
    const [endCertReqExts, certReqExtsRemaining] = hs.expectLengthUint16("certificate request extensions");
    hs.skip(certReqExtsRemaining(), false);
    endCertReqExts();
    endCertReq();
    if (hs.remaining() === 0)
      hs.extend(await readHandshakeRecord());
    certMsgType = hs.readUint8();
  }
  if (certMsgType !== 11)
    throw new Error(`Unexpected handshake message type 0x${hexFromU8([certMsgType])}`);
  const [endCertPayload] = hs.expectLengthUint24(false);
  hs.expectUint8(0, false);
  const [endCerts, certsRemaining] = hs.expectLengthUint24(false);
  const certs = [];
  while (certsRemaining() > 0) {
    const [endCert] = hs.expectLengthUint24(false);
    const cert = new Cert(hs);
    certs.push(cert);
    endCert();
    const [endCertExt, certExtRemaining] = hs.expectLengthUint16();
    const certExtData = hs.subarray(certExtRemaining());
    endCertExt();
  }
  endCerts();
  endCertPayload();
  if (certs.length === 0)
    throw new Error("No certificates supplied");
  const userCert = certs[0];
  const certVerifyHandshakeData = hs.data.subarray(0, hs.offset);
  const certVerifyData = concat(hellos, certVerifyHandshakeData);
  const certVerifyHashBuffer = await cryptoProxy_default.digest("SHA-256", certVerifyData);
  const certVerifyHash = new Uint8Array(certVerifyHashBuffer);
  const certVerifySignedData = concat(txtEnc3.encode(" ".repeat(64) + "TLS 1.3, server CertificateVerify"), [0], certVerifyHash);
  if (hs.remaining() === 0)
    hs.extend(await readHandshakeRecord());
  hs.expectUint8(15, false);
  const [endCertVerifyPayload] = hs.expectLengthUint24(false);
  const sigType = hs.readUint16();
  if (sigType === 1027) {
    const [endSignature] = hs.expectLengthUint16();
    await ecdsaVerify(hs, userCert.publicKey.all, certVerifySignedData, "P-256", "SHA-256");
    endSignature();
  } else if (sigType === 2052) {
    const [endSignature, signatureRemaining] = hs.expectLengthUint16();
    const signature = hs.subarray(signatureRemaining());
    endSignature();
    const signatureKey = await cryptoProxy_default.importKey("spki", userCert.publicKey.all, { name: "RSA-PSS", hash: "SHA-256" }, false, ["verify"]);
    const certVerifyResult = await cryptoProxy_default.verify({ name: "RSA-PSS", saltLength: 32 }, signatureKey, signature, certVerifySignedData);
    if (certVerifyResult !== true)
      throw new Error("RSA-PSS-RSAE-SHA256 certificate verify failed");
  } else {
    throw new Error(`Unsupported certificate verify signature type 0x${hexFromU8([sigType]).padStart(4, "0")}`);
  }
  endCertVerifyPayload();
  const verifyHandshakeData = hs.data.subarray(0, hs.offset);
  const verifyData = concat(hellos, verifyHandshakeData);
  const finishedKey = await hkdfExpandLabel(serverSecret, "finished", new Uint8Array(0), 32, 256);
  const finishedHash = await cryptoProxy_default.digest("SHA-256", verifyData);
  const hmacKey = await cryptoProxy_default.importKey("raw", finishedKey, { name: "HMAC", hash: { name: `SHA-256` } }, false, ["sign"]);
  const correctVerifyHashBuffer = await cryptoProxy_default.sign("HMAC", hmacKey, finishedHash);
  const correctVerifyHash = new Uint8Array(correctVerifyHashBuffer);
  if (hs.remaining() === 0)
    hs.extend(await readHandshakeRecord());
  hs.expectUint8(20, false);
  const [endHsFinishedPayload, hsFinishedPayloadRemaining] = hs.expectLengthUint24(false);
  const verifyHash = hs.readBytes(hsFinishedPayloadRemaining());
  endHsFinishedPayload();
  if (hs.remaining() !== 0)
    throw new Error("Unexpected extra bytes in server handshake");
  const verifyHashVerified = equal(verifyHash, correctVerifyHash);
  if (verifyHashVerified !== true)
    throw new Error("Invalid server verify hash");
  const verifiedToTrustedRoot = await verifyCerts(host, certs, rootCerts);
  if (!verifiedToTrustedRoot)
    throw new Error("Validated certificate chain did not end in a trusted root");
  return [hs.data, clientCertRequested];
}
var txtEnc3;
var init_readEncryptedHandshake = __esm({
  "src/tls/readEncryptedHandshake.ts"() {
    "use strict";
    init_appearance();
    init_keys();
    init_array();
    init_cryptoProxy();
    init_cert();
    init_highlights();
    init_log();
    init_asn1bytes();
    init_hex();
    init_ecdsa();
    init_verifyCerts();
    txtEnc3 = new TextEncoder();
  }
});

// src/tls/startTls.ts
async function startTls(host, rootCerts, networkRead, networkWrite, useSNI = true, writePreData, expectPreData, commentPreData) {
  const ecdhKeys = await cryptoProxy_default.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  const rawPublicKey = await cryptoProxy_default.exportKey("raw", ecdhKeys.publicKey);
  const sessionId = new Uint8Array(32);
  crypto.getRandomValues(sessionId);
  const clientHello = makeClientHello(host, rawPublicKey, sessionId, useSNI);
  const clientHelloData = clientHello.array();
  const initialData = writePreData ? concat(writePreData, clientHelloData) : clientHelloData;
  networkWrite(initialData);
  if (expectPreData) {
    const receivedPreData = await networkRead(expectPreData.length);
    if (!receivedPreData || !equal(receivedPreData, expectPreData))
      throw new Error("Pre data did not match expectation");
  }
  const serverHelloRecord = await readTlsRecord(networkRead, 22 /* Handshake */);
  if (serverHelloRecord === void 0)
    throw new Error("Connection closed while awaiting server hello");
  const serverHello = new Bytes(serverHelloRecord.content);
  const serverPublicKey = parseServerHello(serverHello, sessionId);
  const changeCipherRecord = await readTlsRecord(networkRead, 20 /* ChangeCipherSpec */);
  if (changeCipherRecord === void 0)
    throw new Error("Connection closed awaiting server cipher change");
  const ccipher = new Bytes(changeCipherRecord.content);
  const [endCipherPayload] = ccipher.expectLength(1);
  ccipher.expectUint8(1, false);
  endCipherPayload();
  const clientHelloContent = clientHelloData.subarray(5);
  const serverHelloContent = serverHelloRecord.content;
  const hellos = concat(clientHelloContent, serverHelloContent);
  const handshakeKeys = await getHandshakeKeys(serverPublicKey, ecdhKeys.privateKey, hellos, 256, 16);
  const serverHandshakeKey = await cryptoProxy_default.importKey("raw", handshakeKeys.serverHandshakeKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const handshakeDecrypter = new Crypter("decrypt", serverHandshakeKey, handshakeKeys.serverHandshakeIV);
  const clientHandshakeKey = await cryptoProxy_default.importKey("raw", handshakeKeys.clientHandshakeKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const handshakeEncrypter = new Crypter("encrypt", clientHandshakeKey, handshakeKeys.clientHandshakeIV);
  const readHandshakeRecord = async () => {
    const tlsRecord = await readEncryptedTlsRecord(networkRead, handshakeDecrypter, 22 /* Handshake */);
    if (tlsRecord === void 0)
      throw new Error("Premature end of encrypted server handshake");
    return tlsRecord;
  };
  const [serverHandshake, clientCertRequested] = await readEncryptedHandshake(host, readHandshakeRecord, handshakeKeys.serverSecret, hellos, rootCerts);
  const clientCipherChange = new Bytes(6);
  clientCipherChange.writeUint8(20, false);
  clientCipherChange.writeUint16(771, false);
  const endClientCipherChangePayload = clientCipherChange.writeLengthUint16();
  clientCipherChange.writeUint8(1, false);
  endClientCipherChangePayload();
  const clientCipherChangeData = clientCipherChange.array();
  let clientCertRecordData = new Uint8Array(0);
  if (clientCertRequested) {
    const clientCertRecord = new Bytes(8);
    clientCertRecord.writeUint8(11, false);
    const endClientCerts = clientCertRecord.writeLengthUint24("client certificate data");
    clientCertRecord.writeUint8(0, false);
    clientCertRecord.writeUint24(0, false);
    endClientCerts();
    clientCertRecordData = clientCertRecord.array();
  }
  const wholeHandshake = concat(hellos, serverHandshake, clientCertRecordData);
  const wholeHandshakeHashBuffer = await cryptoProxy_default.digest("SHA-256", wholeHandshake);
  const wholeHandshakeHash = new Uint8Array(wholeHandshakeHashBuffer);
  const finishedKey = await hkdfExpandLabel(handshakeKeys.clientSecret, "finished", new Uint8Array(0), 32, 256);
  const verifyHmacKey = await cryptoProxy_default.importKey("raw", finishedKey, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
  const verifyDataBuffer = await cryptoProxy_default.sign("HMAC", verifyHmacKey, wholeHandshakeHash);
  const verifyData = new Uint8Array(verifyDataBuffer);
  const clientFinishedRecord = new Bytes(36);
  clientFinishedRecord.writeUint8(20, false);
  const clientFinishedRecordEnd = clientFinishedRecord.writeLengthUint24(false);
  clientFinishedRecord.writeBytes(verifyData);
  clientFinishedRecordEnd();
  const clientFinishedRecordData = clientFinishedRecord.array();
  const encryptedClientFinished = await makeEncryptedTlsRecords(concat(clientCertRecordData, clientFinishedRecordData), handshakeEncrypter, 22 /* Handshake */);
  let partialHandshakeHash = wholeHandshakeHash;
  if (clientCertRecordData.length > 0) {
    const partialHandshake = wholeHandshake.subarray(0, wholeHandshake.length - clientCertRecordData.length);
    const partialHandshakeHashBuffer = await cryptoProxy_default.digest("SHA-256", partialHandshake);
    partialHandshakeHash = new Uint8Array(partialHandshakeHashBuffer);
  }
  const applicationKeys = await getApplicationKeys(handshakeKeys.handshakeSecret, partialHandshakeHash, 256, 16);
  const clientApplicationKey = await cryptoProxy_default.importKey("raw", applicationKeys.clientApplicationKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const applicationEncrypter = new Crypter("encrypt", clientApplicationKey, applicationKeys.clientApplicationIV);
  const serverApplicationKey = await cryptoProxy_default.importKey("raw", applicationKeys.serverApplicationKey, { name: "AES-GCM" }, false, ["decrypt"]);
  const applicationDecrypter = new Crypter("decrypt", serverApplicationKey, applicationKeys.serverApplicationIV);
  let wroteFinishedRecords = false;
  const read = () => {
    if (!wroteFinishedRecords) {
      const finishedRecords = concat(clientCipherChangeData, ...encryptedClientFinished);
      networkWrite(finishedRecords);
      wroteFinishedRecords = true;
    }
    return readEncryptedTlsRecord(networkRead, applicationDecrypter);
  };
  const write = async (data) => {
    const encryptedRecords = await makeEncryptedTlsRecords(data, applicationEncrypter, 23 /* Application */);
    const allRecords = wroteFinishedRecords ? concat(...encryptedRecords) : concat(clientCipherChangeData, ...encryptedClientFinished, ...encryptedRecords);
    networkWrite(allRecords);
    wroteFinishedRecords = true;
  };
  return [read, write];
}
var init_startTls = __esm({
  "src/tls/startTls.ts"() {
    "use strict";
    init_makeClientHello();
    init_parseServerHello();
    init_tlsRecord();
    init_keys();
    init_aesgcm();
    init_readEncryptedHandshake();
    init_bytes();
    init_array();
    init_hex();
    init_appearance();
    init_highlights();
    init_log();
    init_cryptoProxy();
  }
});

// src/roots/isrg-root-x1.pem
var isrg_root_x1_default;
var init_isrg_root_x1 = __esm({
  "src/roots/isrg-root-x1.pem"() {
    isrg_root_x1_default = "-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\nTzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\ncmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\nWhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\nZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\nMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\nh77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\nA5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\nT8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\nB5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\nB5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\nKBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\nOlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\njh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\nqHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\nrU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\nHRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\nhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\nNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\nORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\nTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\njNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\noyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\nmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\nemyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n-----END CERTIFICATE-----\n";
  }
});

// src/roots/isrg-root-x2.pem
var isrg_root_x2_default;
var init_isrg_root_x2 = __esm({
  "src/roots/isrg-root-x2.pem"() {
    isrg_root_x2_default = "-----BEGIN CERTIFICATE-----\nMIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw\nCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg\nR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00\nMDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT\nZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw\nEAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW\n+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9\nItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T\nAQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI\nzj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW\ntL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1\n/q4AaOeMSQ+2b1tbFfLn\n-----END CERTIFICATE-----\n";
  }
});

// src/roots/baltimore.pem
var baltimore_default;
var init_baltimore = __esm({
  "src/roots/baltimore.pem"() {
    baltimore_default = "-----BEGIN CERTIFICATE-----\r\nMIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQYDVQQGEwJJ\r\nRTESMBAGA1UEChMJQmFsdGltb3JlMRMwEQYDVQQLEwpDeWJlclRydXN0MSIwIAYD\r\nVQQDExlCYWx0aW1vcmUgQ3liZXJUcnVzdCBSb290MB4XDTAwMDUxMjE4NDYwMFoX\r\nDTI1MDUxMjIzNTkwMFowWjELMAkGA1UEBhMCSUUxEjAQBgNVBAoTCUJhbHRpbW9y\r\nZTETMBEGA1UECxMKQ3liZXJUcnVzdDEiMCAGA1UEAxMZQmFsdGltb3JlIEN5YmVy\r\nVHJ1c3QgUm9vdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKMEuyKr\r\nmD1X6CZymrV51Cni4eiVgLGw41uOKymaZN+hXe2wCQVt2yguzmKiYv60iNoS6zjr\r\nIZ3AQSsBUnuId9Mcj8e6uYi1agnnc+gRQKfRzMpijS3ljwumUNKoUMMo6vWrJYeK\r\nmpYcqWe4PwzV9/lSEy/CG9VwcPCPwBLKBsua4dnKM3p31vjsufFoREJIE9LAwqSu\r\nXmD+tqYF/LTdB1kC1FkYmGP1pWPgkAx9XbIGevOF6uvUA65ehD5f/xXtabz5OTZy\r\ndc93Uk3zyZAsuT3lySNTPx8kmCFcB5kpvcY67Oduhjprl3RjM71oGDHweI12v/ye\r\njl0qhqdNkNwnGjkCAwEAAaNFMEMwHQYDVR0OBBYEFOWdWTCCR1jMrPoIVDaGezq1\r\nBE3wMBIGA1UdEwEB/wQIMAYBAf8CAQMwDgYDVR0PAQH/BAQDAgEGMA0GCSqGSIb3\r\nDQEBBQUAA4IBAQCFDF2O5G9RaEIFoN27TyclhAO992T9Ldcw46QQF+vaKSm2eT92\r\n9hkTI7gQCvlYpNRhcL0EYWoSihfVCr3FvDB81ukMJY2GQE/szKN+OMY3EU/t3Wgx\r\njkzSswF07r51XgdIGn9w/xZchMB5hbgF/X++ZRGjD8ACtPhSNzkE1akxehi/oCr0\r\nEpn3o0WC4zxe9Z2etciefC7IpJ5OCBRLbf1wbWsaY71k5h+3zvDyny67G7fyUIhz\r\nksLi4xaNmjICq44Y3ekQEe5+NauQrz4wlHrQMz2nZQ/1/I6eYs9HRCwBXbsdtTLS\r\nR9I4LtD+gdwyah617jzV/OeBHRnDJELqYzmp\r\n-----END CERTIFICATE-----\r\n";
  }
});

// src/https.ts
var https_exports = {};
__export(https_exports, {
  https: () => https
});
async function https(urlStr, method = "GET", transportFactory) {
  const t0 = Date.now();
  const url = new URL(urlStr);
  if (url.protocol !== "https:")
    throw new Error("Wrong protocol");
  const host = url.hostname;
  const port = url.port || 443;
  const reqPath = url.pathname + url.search;
  const rootCert = TrustedCert.fromPEM(isrg_root_x1_default + isrg_root_x2_default + baltimore_default);
  const transport = await transportFactory(host, port);
  const [read, write] = await startTls(host, rootCert, transport.read, transport.write);
  const request = new Bytes(1024);
  request.writeUTF8String(`${method} ${reqPath} HTTP/1.0\r
Host: ${host}\r
\r
`);
  await write(request.array());
  let responseData;
  let response = "";
  do {
    responseData = await read();
    if (responseData) {
      const responseText = txtDec2.decode(responseData);
      response += responseText;
    }
  } while (responseData);
  log(`time taken: ${Date.now() - t0}ms`);
  return response;
}
var txtDec2;
var init_https = __esm({
  "src/https.ts"() {
    "use strict";
    init_bytes();
    init_appearance();
    init_highlights();
    init_log();
    init_startTls();
    init_cert();
    init_isrg_root_x1();
    init_isrg_root_x2();
    init_baltimore();
    txtDec2 = new TextDecoder();
  }
});

// src/node.ts
import { webcrypto } from "crypto";

// src/util/tcpTransport.ts
import * as net from "net";

// src/util/readqueue.ts
var PretendWebSocket = class {
  addEventListener(...args) {
  }
};
var ReadQueue = class {
  constructor(socket) {
    this.socket = socket;
    this.queue = [];
    if (socket instanceof (globalThis.WebSocket ?? PretendWebSocket)) {
      this.socketIsWebSocket = true;
      socket.addEventListener("message", (msg) => this.enqueue(new Uint8Array(msg.data)));
      socket.addEventListener("close", () => this.dequeue());
    } else {
      this.socketIsWebSocket = false;
      socket.on("data", (data) => this.enqueue(new Uint8Array(data)));
      socket.on("close", () => this.dequeue());
    }
  }
  queue;
  socketIsWebSocket;
  outstandingRequest;
  enqueue(data) {
    this.queue.push(data);
    this.dequeue();
  }
  socketIsNotClosed() {
    const { socket } = this;
    const { readyState } = socket;
    return this.socketIsWebSocket ? readyState <= 1 /* OPEN */ : readyState === "opening" || readyState === "open";
  }
  dequeue() {
    if (this.outstandingRequest === void 0)
      return;
    let { resolve, bytes } = this.outstandingRequest;
    const bytesInQueue = this.bytesInQueue();
    if (bytesInQueue < bytes && this.socketIsNotClosed())
      return;
    bytes = Math.min(bytes, bytesInQueue);
    if (bytes === 0)
      return resolve(void 0);
    this.outstandingRequest = void 0;
    const firstItem = this.queue[0];
    const firstItemLength = firstItem.length;
    if (firstItemLength === bytes) {
      this.queue.shift();
      return resolve(firstItem);
    } else if (firstItemLength > bytes) {
      this.queue[0] = firstItem.subarray(bytes);
      return resolve(firstItem.subarray(0, bytes));
    } else {
      const result = new Uint8Array(bytes);
      let outstandingBytes = bytes;
      let offset = 0;
      while (outstandingBytes > 0) {
        const nextItem = this.queue[0];
        const nextItemLength = nextItem.length;
        if (nextItemLength <= outstandingBytes) {
          this.queue.shift();
          result.set(nextItem, offset);
          offset += nextItemLength;
          outstandingBytes -= nextItemLength;
        } else {
          this.queue[0] = nextItem.subarray(outstandingBytes);
          result.set(nextItem.subarray(0, outstandingBytes), offset);
          outstandingBytes -= outstandingBytes;
          offset += outstandingBytes;
        }
      }
      return resolve(result);
    }
  }
  bytesInQueue() {
    return this.queue.reduce((memo, arr) => memo + arr.length, 0);
  }
  async read(bytes) {
    if (this.outstandingRequest !== void 0)
      throw new Error("Can\u2019t read while already awaiting read");
    return new Promise((resolve) => {
      this.outstandingRequest = { resolve, bytes };
      this.dequeue();
    });
  }
};

// src/util/tcpTransport.ts
async function tcpTransport(host, port) {
  const socket = new net.Socket();
  await new Promise((resolve) => socket.connect(Number(port), host, resolve));
  socket.on("error", (err) => {
    console.log("socket error:", err);
  });
  socket.on("close", () => {
    console.log("connection closed");
  });
  const reader = new ReadQueue(socket);
  const read = reader.read.bind(reader);
  const write = socket.write.bind(socket);
  return { read, write };
}

// src/node.ts
globalThis.crypto = webcrypto;
var iterations = 1;
var { https: https2 } = await Promise.resolve().then(() => (init_https(), https_exports));
for (let i = 0; i < iterations; i++) {
  const html = await https2("https://subtls.pages.dev", "GET", tcpTransport);
  console.log(html);
  if (i < iterations - 1)
    await new Promise((resolve) => setTimeout(resolve, 500));
}
