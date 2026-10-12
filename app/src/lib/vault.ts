"use client";

import { secp256k1 } from "@noble/curves/secp256k1.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, toHex, type Hex } from "viem";

/**
 * Private credit file. "One passkey, many keys":
 *   passkey PRF -> BIP-44 index 0 = wallet key, index 1 = this encryption key.
 * Files are AES-GCM encrypted in the browser. Sharing wraps the file key with ECDH between the
 * owner's and the lender's passkey-derived keys, so only that lender can open it.
 */
const te = new TextEncoder();
const td = new TextDecoder();
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function seal(keyRaw: Uint8Array, data: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", keyRaw as Uint8Array<ArrayBuffer>, "AES-GCM", false, ["encrypt"]);
  const iv = rand(12);
  return { iv, ct: new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as Uint8Array<ArrayBuffer>)) };
}
async function open(keyRaw: Uint8Array, iv: Uint8Array, ct: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", keyRaw as Uint8Array<ArrayBuffer>, "AES-GCM", false, ["decrypt"]);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as Uint8Array<ArrayBuffer> }, key, ct as Uint8Array<ArrayBuffer>));
}

export const encPublicKey = (encKey: Uint8Array): Hex => bytesToHex(secp256k1.getPublicKey(encKey, true));
const selfKey = (encKey: Uint8Array) => hkdf(sha256, encKey, undefined, te.encode("advance/credit-file/self/v1"), 32);
const grantKey = (encKey: Uint8Array, theirPub: Hex, id: Hex) =>
  hkdf(sha256, secp256k1.getSharedSecret(encKey, hexToBytes(theirPub)).slice(1), hexToBytes(id), te.encode("advance/credit-file/grant/v1"), 32);

/** blob = utf8(JSON header) 0x00 ciphertext */
export async function encryptFile(encKey: Uint8Array, file: Uint8Array, mime: string) {
  const fileKey = rand(32);
  const body = await seal(fileKey, file);
  const wrapped = await seal(selfKey(encKey), fileKey);
  const header = te.encode(JSON.stringify({ v: 1, mime, iv: b64(body.iv), selfIv: b64(wrapped.iv), self: b64(wrapped.ct) }));
  const blob = new Uint8Array(header.length + 1 + body.ct.length);
  blob.set(header);
  blob.set(body.ct, header.length + 1);
  return { id: toHex(rand(32)), blob: bytesToHex(blob) };
}

function parse(blobHex: Hex) {
  const blob = hexToBytes(blobHex);
  const sep = blob.indexOf(0);
  const header = JSON.parse(td.decode(blob.slice(0, sep))) as { mime: string; iv: string; selfIv: string; self: string };
  return { header, ct: blob.slice(sep + 1) };
}

async function decryptWith(fileKey: Uint8Array, blobHex: Hex) {
  const { header, ct } = parse(blobHex);
  return new Blob([(await open(fileKey, unb64(header.iv), ct)) as Uint8Array<ArrayBuffer>], { type: header.mime });
}

export async function openOwnFile(encKey: Uint8Array, blobHex: Hex) {
  const { header } = parse(blobHex);
  return decryptWith(await open(selfKey(encKey), unb64(header.selfIv), unb64(header.self)), blobHex);
}

export async function wrapForLender(encKey: Uint8Array, blobHex: Hex, id: Hex, lenderPub: Hex): Promise<Hex> {
  const { header } = parse(blobHex);
  const fileKey = await open(selfKey(encKey), unb64(header.selfIv), unb64(header.self));
  const w = await seal(grantKey(encKey, lenderPub, id), fileKey);
  return bytesToHex(te.encode(JSON.stringify({ from: encPublicKey(encKey), iv: b64(w.iv), ct: b64(w.ct) })));
}

export async function openSharedFile(encKey: Uint8Array, blobHex: Hex, id: Hex, wrappedHex: Hex) {
  const w = JSON.parse(td.decode(hexToBytes(wrappedHex))) as { from: Hex; iv: string; ct: string };
  const fileKey = await open(grantKey(encKey, w.from, id), unb64(w.iv), unb64(w.ct));
  return decryptWith(fileKey, blobHex);
}

/** Shrinks photos so a document fits in one Monad transaction (≤ 48 KB). */
export async function prepareFile(f: File): Promise<{ bytes: Uint8Array; mime: string }> {
  if (f.type.startsWith("image/")) {
    const img = await createImageBitmap(f);
    for (const [max, q] of [[900, 0.6], [700, 0.5], [500, 0.45]] as const) {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = new OffscreenCanvas(Math.round(img.width * s), Math.round(img.height * s));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const out = new Uint8Array(await (await c.convertToBlob({ type: "image/jpeg", quality: q })).arrayBuffer());
      if (out.length < 46_000) return { bytes: out, mime: "image/jpeg" };
    }
    throw new Error("That photo is too detailed to store. Try a smaller one.");
  }
  const bytes = new Uint8Array(await f.arrayBuffer());
  if (bytes.length > 46_000) throw new Error("Files must be under 45 KB (photos are shrunk automatically).");
  return { bytes, mime: f.type || "application/octet-stream" };
}
