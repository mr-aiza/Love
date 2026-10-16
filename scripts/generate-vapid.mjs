#!/usr/bin/env node
import { generateKeyPairSync } from 'node:crypto';

// Run locally with: node scripts/generate-vapid.mjs
// Never commit the printed private key or paste it into public source files.
const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pub = publicKey.export({ format: 'jwk' });
const priv = privateKey.export({ format: 'jwk' });
const publicBytes = Buffer.concat([
  Buffer.from([4]),
  Buffer.from(pub.x, 'base64url'),
  Buffer.from(pub.y, 'base64url')
]);
console.log('VAPID_PUBLIC_KEY=' + publicBytes.toString('base64url'));
console.log('VAPID_PRIVATE_KEY=' + Buffer.from(priv.d, 'base64url').toString('base64url'));
console.log('VAPID_SUBJECT=mailto:your-contact@example.com');
console.log('\nCopy the public key into a Worker variable. Save the private key as a Worker Secret. Do not commit either key.');
