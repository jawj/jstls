
import { ASN1Bytes } from '../util/asn1bytes';

import {
  universalTypeBitString,
  universalTypeBoolean,
  universalTypeInteger,
  universalTypeNull,
  universalTypeOctetString,
  universalTypeOID,
  universalTypeUTCTime,
  constructedContextSpecificType,
  constructedUniversalTypeSequence,
  contextSpecificType,
  GeneralName,
  extKeyUsageOIDMap,
  extOIDMap,
  keyOIDMap,
  extAccessMethodOIDMap,
  certPolOIDMap,
  certPolQualOIDMap,
  algorithmWithOID,
  intFromBitString,
  readNamesSeq,
  readSeqOfSetOfSeq,
  descriptionForAlgorithm,
  universalTypeIA5String,
  universalTypeGeneralizedTime,
} from './certUtils';

import { hexFromU8, u8FromHex } from '../util/hex';
import { GrowableData } from '../util/array';
import { fromBase64 } from 'hextreme';

export type OID = string;

export const allKeyUsages = [
  // https://www.rfc-editor.org/rfc/rfc3280#section-4.2.1.3
  'digitalSignature', // (0)
  'nonRepudiation',   // (1)
  'keyEncipherment',  // (2)
  'dataEncipherment', // (3)
  'keyAgreement',     // (4)
  'keyCertSign',      // (5)
  'cRLSign',          // (6)
  'encipherOnly',     // (7)
  'decipherOnly',     // (8)
] as const;

export type CertJSON = ReturnType<typeof Cert.prototype.toJSON>;
export type DistinguishedName = Record<string, string | string[]>;

export interface RootCertsIndex {
  offsets: number[];
  subjects: Record<string, number>;
}

export type RootCertsData = Uint8Array;

export interface RootCertsDatabase {
  index: RootCertsIndex;
  data: RootCertsData;
}

export class Cert {
  serialNumber!: Uint8Array;
  algorithm!: OID;
  issuer!: DistinguishedName;
  validityPeriod!: { notBefore: Date; notAfter: Date };
  subject!: DistinguishedName;
  publicKey!: { identifiers: OID[]; data: Uint8Array; all: Uint8Array };
  signature!: Uint8Array;
  keyUsage?: { critical?: boolean; usages: Set<typeof allKeyUsages[number]> };
  subjectAltNames?: string[];
  extKeyUsage?: { clientTls?: true; serverTls?: true };
  authorityKeyIdentifier?: Uint8Array;
  subjectKeyIdentifier?: Uint8Array;
  basicConstraints?: { critical?: boolean; ca?: boolean; pathLength?: number } | undefined;
  // nameConstraints?: { critical?: boolean; permitted?: string[]; excluded?: string[] };
  signedData!: Uint8Array;
  rawData!: Uint8Array;

  constructor() {
    throw new Error('Use `await Cert.create(...)`, not `new Cert(...)`');
  }

  static distinguishedNamesAreEqual(dn1: DistinguishedName, dn2: DistinguishedName) {
    return this.stringFromDistinguishedName(dn1) === this.stringFromDistinguishedName(dn2);
  }

  static stringFromDistinguishedName(dn: DistinguishedName) {
    return Object.entries(dn)
      .map(([k, vs]) =>
        typeof vs === 'string' ? `${k}=${vs.trim().replace(/[\\,]/g, '\\$&')}` :
          vs.map(v => `${k}=${v.trim().replace(/[\\,]/g, '\\$&')}`).join(', ')
      ).join(', ');
  }

  static async create(certData: Uint8Array | ASN1Bytes | CertJSON) {
    const cert: Cert = Object.create(this.prototype);

    if (certData instanceof ASN1Bytes || certData instanceof Uint8Array) {
      const cb = certData instanceof ASN1Bytes ? certData : new ASN1Bytes(certData);
      const certSeqStartOffset = cb.offset;

      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (certificate)');
      const [endCertSeq] = await cb.expectASN1Length(chatty && 'certificate sequence');

      const tbsCertStartOffset = cb.offset;

      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (certificate info)');
      const [endCertInfoSeq] = await cb.expectASN1Length(chatty && 'certificate info');

      await cb.expectBytes([0xa0, 0x03, 0x02, 0x01, 0x02], chatty && 'certificate version 3');  // must be v3 to have extensions

      // serial number
      await cb.expectUint8(universalTypeInteger, chatty && 'integer');
      const [endSerialNumber, serialNumberRemaining] = await cb.expectASN1Length(chatty && 'serial number');
      cert.serialNumber = await cb.subarrayForRead(serialNumberRemaining());
      chatty && cb.comment('serial number');
      endSerialNumber();

      // algorithm
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (algorithm)');
      const [endAlgo, algoRemaining] = await cb.expectASN1Length(chatty && 'algorithm sequence');
      await cb.expectUint8(universalTypeOID, chatty && 'OID');
      cert.algorithm = await cb.readASN1OID();
      chatty && cb.comment(`${cert.algorithm} = ${descriptionForAlgorithm(algorithmWithOID(cert.algorithm))}`);
      if (algoRemaining() > 0) {  // null parameters
        await cb.expectUint8(universalTypeNull, chatty && 'null');
        await cb.expectUint8(0x00, chatty && 'null length');
      }
      endAlgo();

      // issuer
      cert.issuer = await readSeqOfSetOfSeq(cb, 'issuer');

      // validity
      let notBefore, notAfter;
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (validity)');
      const [endValiditySeq] = await cb.expectASN1Length(chatty && 'validity sequence');

      const startTimeType = await cb.readUint8();
      if (startTimeType === universalTypeUTCTime) {
        chatty && cb.comment('UTC time (not before)');
        notBefore = await cb.readASN1UTCTime();
      } else if (startTimeType === universalTypeGeneralizedTime) {
        chatty && cb.comment('generalized time (not before)');
        notBefore = await cb.readASN1GeneralizedTime();
      } else {
        throw new Error(`Unexpected validity start type 0x${hexFromU8([startTimeType])}`);
      }

      const endTimeType = await cb.readUint8();
      if (endTimeType === universalTypeUTCTime) {
        chatty && cb.comment('UTC time (not after)');
        notAfter = await cb.readASN1UTCTime();
      } else if (endTimeType === universalTypeGeneralizedTime) {
        chatty && cb.comment('generalized time (not after)');
        notAfter = await cb.readASN1GeneralizedTime();
      } else {
        throw new Error(`Unexpected validity end type 0x${hexFromU8([endTimeType])}`);
      }

      cert.validityPeriod = { notBefore, notAfter };
      endValiditySeq();

      // subject
      cert.subject = await readSeqOfSetOfSeq(cb, 'subject');

      // public key
      const publicKeyStartOffset = cb.offset;
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (public key)');
      const [endPublicKeySeq] = await cb.expectASN1Length(chatty && 'public key sequence');
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (public key params)');
      const [endKeyOID, keyOIDRemaining] = await cb.expectASN1Length(chatty && 'public key params sequence');

      const publicKeyOIDs: string[] = [];
      while (keyOIDRemaining() > 0) {
        const keyParamRecordType = await cb.readUint8();
        if (keyParamRecordType === universalTypeOID) {
          chatty && cb.comment('OID');
          const keyOID = await cb.readASN1OID();
          chatty && cb.comment(`${keyOID} = ${keyOIDMap[keyOID]}`);
          publicKeyOIDs.push(keyOID);

        } else if (keyParamRecordType === universalTypeNull) {
          chatty && cb.comment('null');
          await cb.expectUint8(0x00, chatty && 'null length');
        }
      }
      endKeyOID();

      await cb.expectUint8(universalTypeBitString, chatty && 'bit string');
      const publicKeyData = await cb.readASN1BitString();
      chatty && cb.comment('public key');

      cert.publicKey = { identifiers: publicKeyOIDs, data: publicKeyData, all: cb.data.subarray(publicKeyStartOffset, cb.offset) };

      endPublicKeySeq();

      // extensions
      await cb.expectUint8(constructedContextSpecificType, chatty && 'constructed context-specific type: extensions');
      const [endExtsData] = await cb.expectASN1Length();
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (certificate extensions)');
      const [endExts, extsRemaining] = await cb.expectASN1Length(chatty && 'sequence');

      while (extsRemaining() > 0) {
        await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (certificate extension)');
        const [endExt, extRemaining] = await cb.expectASN1Length();
        await cb.expectUint8(universalTypeOID, chatty && 'OID (extension type)');
        const extOID = await cb.readASN1OID();
        chatty && cb.comment(`${extOID} = ${extOIDMap[extOID]}`);

        if (extOID === '2.5.29.17') {  // subjectAltName
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endSanDerDoc] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (names)');
          const allSubjectAltNames = await readNamesSeq(cb, contextSpecificType);
          cert.subjectAltNames = allSubjectAltNames
            .filter((san: any) => san.type === (GeneralName.dNSName | contextSpecificType))
            .map((san: any) => san.name);
          endSanDerDoc();

        } else if (extOID === '2.5.29.15') {  // keyUsage
          let keyUsageCritical;
          let nextType = await cb.readUint8();
          if (nextType === universalTypeBoolean) {
            chatty && cb.comment('boolean');
            keyUsageCritical = await cb.readASN1Boolean(chatty && 'critical: %');
            nextType = await cb.readUint8();
          }
          if (nextType !== universalTypeOctetString) throw new Error(`Expected 0x${hexFromU8([universalTypeOctetString])}, got 0x${hexFromU8([nextType])}`);
          chatty && cb.comment('octet string');
          const [endKeyUsageDer] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(universalTypeBitString, chatty && 'bit string');
          const keyUsageBitStr = await cb.readASN1BitString();
          const keyUsageBitmask = intFromBitString(keyUsageBitStr);
          const keyUsageNames = new Set(allKeyUsages.filter((u, i) => keyUsageBitmask & (1 << i)));
          chatty && cb.comment(`key usage: ${keyUsageBitmask} = ${[...keyUsageNames].join(', ')}`);
          endKeyUsageDer();
          cert.keyUsage = {
            critical: keyUsageCritical,
            usages: keyUsageNames,
          };

        } else if (extOID === '2.5.29.37') {  // extKeyUsage
          cert.extKeyUsage = {};
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endExtKeyUsageDer] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
          const [endExtKeyUsage, extKeyUsageRemaining] = await cb.expectASN1Length(chatty && 'key usage OIDs');
          while (extKeyUsageRemaining() > 0) {
            await cb.expectUint8(universalTypeOID, chatty && 'OID');
            const extKeyUsageOID = await cb.readASN1OID();
            chatty && cb.comment(`${extKeyUsageOID} = ${extKeyUsageOIDMap[extKeyUsageOID]}`);
            if (extKeyUsageOID === '1.3.6.1.5.5.7.3.1') cert.extKeyUsage.serverTls = true;
            if (extKeyUsageOID === '1.3.6.1.5.5.7.3.2') cert.extKeyUsage.clientTls = true;
          }
          endExtKeyUsage();
          endExtKeyUsageDer();

        } else if (extOID === '2.5.29.35') {  // authorityKeyIdentifier
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endAuthKeyIdDer] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
          const [endAuthKeyIdSeq, authKeyIdSeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

          while (authKeyIdSeqRemaining() > 0) {
            const authKeyIdDatumType = await cb.readUint8();
            if (authKeyIdDatumType === (contextSpecificType | 0)) {
              chatty && cb.comment('context-specific type: key identifier');
              const [endAuthKeyId, authKeyIdRemaining] = await cb.expectASN1Length(chatty && 'authority key identifier');
              cert.authorityKeyIdentifier = await cb.readBytes(authKeyIdRemaining());
              chatty && cb.comment('authority key identifier');
              endAuthKeyId();

            } else if (authKeyIdDatumType === (contextSpecificType | 1)) {
              chatty && cb.comment('context-specific type: authority cert issuer');
              const [endAuthKeyIdCertIssuer, authKeyIdCertIssuerRemaining] = await cb.expectASN1Length(chatty && 'authority cert issuer');
              await cb.skipRead(authKeyIdCertIssuerRemaining(), chatty && 'ignored');
              endAuthKeyIdCertIssuer();

            } else if (authKeyIdDatumType === (contextSpecificType | 2)) {
              chatty && cb.comment('context-specific type: authority cert serial number');
              const [endAuthKeyIdCertSerialNo, authKeyIdCertSerialNoRemaining] = await cb.expectASN1Length(chatty && 'authority cert issuer or authority cert serial number');
              await cb.skipRead(authKeyIdCertSerialNoRemaining(), chatty && 'ignored');
              endAuthKeyIdCertSerialNo();

            } else if (authKeyIdDatumType === (contextSpecificType | 33)) {  // where is this documented?!
              chatty && cb.comment('context-specific type: DirName');
              const [endDirName, dirNameRemaining] = await cb.expectASN1Length(chatty && 'DirName');
              await cb.skipRead(dirNameRemaining(), chatty && 'ignored');
              chatty && console.log(cb.commentedString());
              endDirName();

            } else {
              throw new Error(`Unexpected data type ${authKeyIdDatumType} in authorityKeyIdentifier certificate extension`);
            }
          }

          endAuthKeyIdSeq();
          endAuthKeyIdDer();

        } else if (extOID === '2.5.29.14') {  // subjectKeyIdentifier
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endSubjectKeyIdDer] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endSubjectKeyId, subjectKeyIdRemaining] = await cb.expectASN1Length(chatty && 'subject key identifier');
          cert.subjectKeyIdentifier = await cb.readBytes(subjectKeyIdRemaining());
          chatty && cb.comment('subject key identifier');
          endSubjectKeyId();
          endSubjectKeyIdDer();

        } else if (extOID === '2.5.29.19') {  // basicConstraints
          let basicConstraintsCritical;
          let bcNextType = await cb.readUint8();
          if (bcNextType === universalTypeBoolean) {
            chatty && cb.comment('boolean');
            basicConstraintsCritical = await cb.readASN1Boolean(chatty && 'critical: %');
            bcNextType = await cb.readUint8();
          }
          if (bcNextType !== universalTypeOctetString) throw new Error('Unexpected type in certificate basic constraints');
          chatty && cb.comment('octet string');
          const [endBasicConstraintsDer] = await cb.expectASN1Length(chatty && 'DER document');
          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
          const [endConstraintsSeq, constraintsSeqRemaining] = await cb.expectASN1Length();

          let basicConstraintsCa = undefined;
          if (constraintsSeqRemaining() > 0) {
            await cb.expectUint8(universalTypeBoolean, chatty && 'boolean');
            basicConstraintsCa = await cb.readASN1Boolean(chatty && 'certificate authority: %');
          }

          let basicConstraintsPathLength;
          if (constraintsSeqRemaining() > 0) {
            await cb.expectUint8(universalTypeInteger, chatty && 'integer');
            const maxPathLengthLength = await cb.readASN1Length(chatty && 'max path length');
            basicConstraintsPathLength =
              maxPathLengthLength === 1 ? await cb.readUint8() :
                maxPathLengthLength === 2 ? await cb.readUint16() :
                  maxPathLengthLength === 3 ? await cb.readUint24() :
                    undefined;
            if (basicConstraintsPathLength === undefined) throw new Error('Too many bytes in max path length in certificate basicConstraints');
            chatty && cb.comment('max path length');
          }

          endConstraintsSeq();
          endBasicConstraintsDer();

          cert.basicConstraints = {
            critical: basicConstraintsCritical,
            ca: basicConstraintsCa,
            pathLength: basicConstraintsPathLength,
          };

        } else if (chatty && extOID === '1.3.6.1.5.5.7.1.1') {  // authorityInfoAccess -- only parsed for annotation purposes
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endAuthInfoAccessDER] = await cb.expectASN1Length(chatty && 'DER document');

          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
          const [endAuthInfoAccessSeq, authInfoAccessSeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

          while (authInfoAccessSeqRemaining() > 0) {
            await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
            const [endAuthInfoAccessInnerSeq] = await cb.expectASN1Length(chatty && 'sequence');

            await cb.expectUint8(universalTypeOID, chatty && 'OID');
            const accessMethodOID = await cb.readASN1OID();
            chatty && cb.comment(`${accessMethodOID} = access method: ${extAccessMethodOIDMap[accessMethodOID] ?? 'unknown method'} `);

            await cb.expectUint8(contextSpecificType | GeneralName.uniformResourceIdentifier, chatty && 'context-specific type: URI');
            const [endMethodURI, methodURIRemaining] = await cb.expectASN1Length(chatty && 'access location');
            await cb.readUTF8String(methodURIRemaining());
            endMethodURI();

            endAuthInfoAccessInnerSeq();
          }

          endAuthInfoAccessSeq();
          endAuthInfoAccessDER();

        } else if (chatty && extOID === '2.5.29.32') {  // certificatePolicies -- only parsed for annotation purposes
          await cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          const [endCertPolDER] = await cb.expectASN1Length(chatty && 'DER document');

          await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (CertificatePolicies)');
          const [endCertPolSeq, certPolSeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

          while (certPolSeqRemaining() > 0) {
            await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (PolicyInformation)');
            const [endCertPolInnerSeq, certPolInnerSeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

            await cb.expectUint8(universalTypeOID, chatty && 'OID (CertPolicyID)');
            const certPolOID = await cb.readASN1OID();
            chatty && cb.comment(`${certPolOID} = policy: ${certPolOIDMap[certPolOID] ?? 'unknown policy'} `);

            while (certPolInnerSeqRemaining() > 0) {
              await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence');
              const [endCertPolInner2Seq, certPolInner2SeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

              while (certPolInner2SeqRemaining() > 0) {
                await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (PolicyQualifierInformation)');
                const [endCertPolInner3Seq, certPolInner3SeqRemaining] = await cb.expectASN1Length(chatty && 'sequence');

                await cb.expectUint8(universalTypeOID, chatty && 'OID (policyQualifierId)');
                const certPolQualOID = await cb.readASN1OID();
                chatty && cb.comment(`${certPolQualOID} = qualifier: ${certPolQualOIDMap[certPolQualOID] ?? 'unknown qualifier'} `);

                const qualType = await cb.readUint8();
                if (chatty && qualType === universalTypeIA5String) {
                  cb.comment('IA5String');
                  const [endQualStr, qualStrRemaining] = await cb.expectASN1Length('string');
                  await cb.readUTF8String(qualStrRemaining());
                  endQualStr();

                } else {
                  if (certPolInner3SeqRemaining()) await cb.skipRead(certPolInner3SeqRemaining(), 'skipped policy qualifier data');
                }

                endCertPolInner3Seq();
              }

              endCertPolInner2Seq();
            }

            endCertPolInnerSeq();
          }

          endCertPolSeq();
          endCertPolDER();

          // } else if (chatty && extOID === '2.5.29.31') {  // CRLDistributionPoints -- only parsed for annotation purposes
          //   cb.expectUint8(universalTypeOctetString, chatty && 'octet string');
          //   const [endCRLDPDER] = cb.expectASN1Length(chatty && 'DER document');

          //   cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (DistributionPoints)');
          //   const [endCRLDPSeq, CRLDPRemaining] = cb.expectASN1Length(chatty && 'sequence');

          // TODO

        } else {
          /**
           * ignored extensions include:
           * - Name Constraints -- important! see https://bettertls.com/
           * - CRL Distribution Points -- started implementation above
           * - Signed Certificate Timestamp (SCT) List
           */
          // TODO: check for criticality, throw if critical
          await cb.skipRead(extRemaining(), chatty && 'ignored extension data');
        }

        endExt();
      }

      endExts();
      endExtsData();

      endCertInfoSeq();

      // to-be-signed cert data: https://crypto.stackexchange.com/questions/42345/what-information-is-signed-by-a-certification-authority
      cert.signedData = cb.data.subarray(tbsCertStartOffset, cb.offset);

      // signature algorithm
      await cb.expectUint8(constructedUniversalTypeSequence, chatty && 'sequence (signature algorithm)');
      const [endSigAlgo, sigAlgoRemaining] = await cb.expectASN1Length(chatty && 'signature algorithm sequence');
      await cb.expectUint8(universalTypeOID, chatty && 'OID');
      const sigAlgoOID = await cb.readASN1OID(chatty && '% (must be same as above)');
      if (sigAlgoRemaining() > 0) {
        await cb.expectUint8(universalTypeNull, chatty && 'null');
        await cb.expectUint8(0x00, chatty && 'null length');
      }
      endSigAlgo();
      if (sigAlgoOID !== cert.algorithm) throw new Error(`Certificate specifies different signature algorithms inside (${cert.algorithm}) and out (${sigAlgoOID})`);

      // signature
      await cb.expectUint8(universalTypeBitString, chatty && 'bitstring (signature)');
      cert.signature = await cb.readASN1BitString();
      chatty && cb.comment('signature');

      endCertSeq();

      cert.rawData = cb.data.subarray(certSeqStartOffset, cb.offset);

    } else {
      cert.serialNumber = u8FromHex(certData.serialNumber);
      cert.algorithm = certData.algorithm;
      cert.issuer = certData.issuer;
      cert.validityPeriod = {
        notBefore: new Date(certData.validityPeriod.notBefore),
        notAfter: new Date(certData.validityPeriod.notAfter),
      };
      cert.subject = certData.subject;
      cert.publicKey = {
        identifiers: certData.publicKey.identifiers,
        data: u8FromHex(certData.publicKey.data),
        all: u8FromHex(certData.publicKey.all),
      };
      cert.signature = u8FromHex(certData.signature);
      cert.keyUsage = {
        critical: certData.keyUsage.critical,
        usages: new Set(certData.keyUsage.usages),
      };
      cert.subjectAltNames = certData.subjectAltNames;
      cert.extKeyUsage = certData.extKeyUsage;
      if (certData.authorityKeyIdentifier) cert.authorityKeyIdentifier = u8FromHex(certData.authorityKeyIdentifier);
      if (certData.subjectKeyIdentifier) cert.subjectKeyIdentifier = u8FromHex(certData.subjectKeyIdentifier);
      cert.basicConstraints = certData.basicConstraints;
      cert.signedData = u8FromHex(certData.signedData);
      cert.rawData = u8FromHex(certData.rawData);
    }

    return cert;
  }

  subjectAltNameMatchingHost(host: string) {
    const twoDotRegex = /[.][^.]+[.][^.]+$/;
    return (this.subjectAltNames ?? []).find(cert => {
      let certName = cert;
      let hostName = host;

      // wildcards: https://en.wikipedia.org/wiki/Wildcard_certificate
      if (twoDotRegex.test(host) && twoDotRegex.test(certName) && certName.startsWith('*.')) {
        certName = certName.slice(1);
        hostName = hostName.slice(hostName.indexOf('.'));
      }

      if (certName === hostName) return true;
    });
  }

  isValidAtMoment(moment = new Date()) {
    return moment >= this.validityPeriod.notBefore && moment <= this.validityPeriod.notAfter;
  }

  description() {
    return 'subject: ' + Cert.stringFromDistinguishedName(this.subject) +
      (this.subjectAltNames ? '\nsubject alt names: ' + this.subjectAltNames.join(', ') : '') +
      (this.subjectKeyIdentifier ? `\nsubject key id: ${hexFromU8(this.subjectKeyIdentifier, ' ')}` : '') +
      '\nissuer: ' + Cert.stringFromDistinguishedName(this.issuer) +
      (this.authorityKeyIdentifier ? `\nauthority key id: ${hexFromU8(this.authorityKeyIdentifier, ' ')}` : '') +
      '\nvalidity: ' + this.validityPeriod.notBefore.toISOString() + ' — ' + this.validityPeriod.notAfter.toISOString() + ` (${this.isValidAtMoment() ? 'currently valid' : 'not valid'})` +
      (this.keyUsage ? `\nkey usage (${this.keyUsage.critical ? 'critical' : 'non-critical'}): ` +
        [...this.keyUsage.usages].join(', ') : '') +
      (this.extKeyUsage ? `\nextended key usage: TLS server — ${this.extKeyUsage.serverTls}, TLS client — ${this.extKeyUsage.clientTls}` : '') +
      (this.basicConstraints ? `\nbasic constraints (${this.basicConstraints.critical ? 'critical' : 'non-critical'}): ` +
        `CA — ${this.basicConstraints.ca}, path length — ${this.basicConstraints.pathLength}` : '') +
      '\nsignature algorithm: ' + descriptionForAlgorithm(algorithmWithOID(this.algorithm));
  }

  toJSON() {
    return {
      serialNumber: hexFromU8(this.serialNumber),
      algorithm: this.algorithm,
      issuer: this.issuer,
      validityPeriod: {
        notBefore: this.validityPeriod.notBefore.toISOString(),
        notAfter: this.validityPeriod.notAfter.toISOString(),
      },
      subject: this.subject,
      publicKey: {
        identifiers: this.publicKey.identifiers,
        data: hexFromU8(this.publicKey.data),
        all: hexFromU8(this.publicKey.all),
      },
      signature: hexFromU8(this.signature),
      keyUsage: {
        critical: this.keyUsage?.critical,
        usages: [...(this.keyUsage?.usages ?? [])],
      },
      subjectAltNames: this.subjectAltNames,
      extKeyUsage: this.extKeyUsage,
      authorityKeyIdentifier: this.authorityKeyIdentifier && hexFromU8(this.authorityKeyIdentifier),
      subjectKeyIdentifier: this.subjectKeyIdentifier && hexFromU8(this.subjectKeyIdentifier),
      basicConstraints: this.basicConstraints,
      signedData: hexFromU8(this.signedData),
      rawData: hexFromU8(this.rawData),
    };
  }

  static uint8ArraysFromPEM(pem: string) {
    const tag = '[A-Z0-9 ]+';
    const pattern = new RegExp(`-----BEGIN ${tag}-----([a-zA-Z0-9=+\\/\\n\\r]+)-----END ${tag}-----`, 'g');
    const res = [];
    let matches = null;
    while ((matches = pattern.exec(pem))) {
      const base64 = matches[1].replace(/[\r\n]/g, '');
      const binary = fromBase64(base64);
      res.push(binary);
    }
    return res;
  }

  static fromPEM(pem: string) {
    return Promise.all(this.uint8ArraysFromPEM(pem).map(arr => this.create(arr)));
  }
}

export class TrustedCert extends Cert {
  static async databaseFromPEM(pem: string) {  // not efficient: if passing many certs, use saved results
    const certsData = this.uint8ArraysFromPEM(pem);
    const offsets = [0];
    const subjects: Record<string, number> = {};
    const growable = new GrowableData();
    for (const certData of certsData) {
      const cert = await this.create(certData);
      const offsetIndex = offsets.length - 1;
      if (cert.subjectKeyIdentifier) subjects[hexFromU8(cert.subjectKeyIdentifier)] = offsetIndex;
      subjects[this.stringFromDistinguishedName(cert.subject)] = offsetIndex;
      growable.append(certData);
      offsets[offsets.length] = offsets[offsetIndex] + certData.length;
    }
    const data = growable.getData();
    return { index: { offsets, subjects }, data } as RootCertsDatabase;
  }

  static async findInDatabase(subjectOrSubjectKeyId: DistinguishedName | string, db: RootCertsDatabase) {
    const { index: { subjects, offsets }, data } = db;
    const key = typeof subjectOrSubjectKeyId === 'string' ?
      subjectOrSubjectKeyId : Cert.stringFromDistinguishedName(subjectOrSubjectKeyId);

    const offsetIndex = subjects[key];
    if (offsetIndex === undefined) return;

    const start = offsets[offsetIndex];
    const end = offsets[offsetIndex + 1];
    const certData = data.subarray(start, end);
    const cert = await this.create(certData);

    return cert;
  }
}
