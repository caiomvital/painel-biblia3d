import { randomUUID } from "node:crypto";
import { operationalLog } from "./operational-log";
import { curriculumStorageConfiguration } from "./curriculum-storage-config";

export const CURRICULUM_BUCKET = "curriculos-biblia3d";
export const CURRICULUM_MAX_BYTES = 5 * 1024 * 1024;
const STORAGE_TIMEOUT_MS = 20_000;

function storageConfig() {
  try {
    return curriculumStorageConfiguration();
  } catch {
    throw Object.assign(new Error("Storage indisponível."), { statusCode: 503 });
  }
}

function objectUrl(objectKey: string) {
  const { baseUrl } = storageConfig();
  const path = `/storage/v1/object/${CURRICULUM_BUCKET}/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
  return new URL(path, baseUrl);
}

async function storageRequest(url: URL, init: RequestInit = {}) {
  const { key } = storageConfig();
  try {
    return await fetch(url, {
      ...init,
      headers: { apikey: key, ...init.headers },
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    operationalLog("curriculum.storage.request_failed", error);
    throw Object.assign(new Error("Não foi possível acessar o armazenamento agora."), { statusCode: 503 });
  }
}

export function curriculumObjectKey(userId: string) {
  return `${userId}/${randomUUID()}.pdf`;
}

export async function uploadCurriculum(objectKey: string, bytes: Uint8Array) {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const response = await storageRequest(objectUrl(objectKey), {
    method: "POST",
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "x-upsert": "false",
    },
    body,
  });
  if (!response.ok) {
    operationalLog("curriculum.storage.upload_failed", undefined, { status: response.status });
    throw Object.assign(new Error("Não foi possível guardar o currículo."), { statusCode: 502 });
  }
}

export async function deleteCurriculumObject(objectKey: string) {
  const response = await storageRequest(objectUrl(objectKey), { method: "DELETE" });
  if (!response.ok) {
    operationalLog("curriculum.storage.delete_failed", undefined, { status: response.status });
    throw Object.assign(new Error("Não foi possível remover o arquivo do armazenamento."), { statusCode: 502 });
  }
}

export async function downloadCurriculumObject(objectKey: string) {
  const response = await storageRequest(objectUrl(objectKey));
  if (!response.ok || !response.body) {
    operationalLog("curriculum.storage.download_failed", undefined, { status: response.status });
    throw Object.assign(new Error("Não foi possível baixar o currículo."), { statusCode: response.status === 404 ? 404 : 502 });
  }
  return response.body;
}

export function safeCurriculumFileName(name: string) {
  return name
    .normalize("NFKC")
    .replace(/[\\/\r\n\0]/g, "_")
    .replace(/[^\p{L}\p{N} ._()-]/gu, "")
    .trim()
    .slice(0, 120) || "curriculo.pdf";
}

