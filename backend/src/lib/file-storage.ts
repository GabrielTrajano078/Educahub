import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}

export async function ensureUploadDir(relativeDir: string): Promise<string> {
  const fullDir = path.join(UPLOAD_ROOT, relativeDir);
  await fs.mkdir(fullDir, { recursive: true });
  return fullDir;
}

export async function saveBufferToStorage(params: {
  buffer: Buffer;
  relativeDir: string;
  filename: string;
}): Promise<{ storageKey: string; sizeBytes: number; sha256: string; absolutePath: string }> {
  const safeName = sanitizeFilename(params.filename);
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  const storageKey = path.join(params.relativeDir, `${uniquePrefix}-${safeName}`);
  const absolutePath = path.join(UPLOAD_ROOT, storageKey);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, params.buffer);

  const sha256 = crypto.createHash("sha256").update(params.buffer).digest("hex");

  return {
    storageKey: storageKey.replace(/\\/g, "/"),
    sizeBytes: params.buffer.byteLength,
    sha256,
    absolutePath,
  };
}

export function buildPublicFileUrl(baseUrl: string, storageKey: string): string {
  return `${baseUrl.replace(/\/$/, "")}/uploads/${storageKey.replace(/^\/+/, "")}`;
}
