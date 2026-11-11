import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/cloudflare-r2";
export const ADAPTER_KEY = "cloudflare-r2";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const SUPPORTED_RUNTIME_ADAPTER_KEY = "cloudflare";
export const DEFAULT_R2_BINDING = "LUCID_MEDIA_BUCKET";
export const DEFAULT_MAX_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB
export const PRESIGNED_URL_EXPIRY = 3600; // 1 hour
export const DEFAULT_PART_SIZE = 8 * 1024 * 1024; // 8 MiB
export const INTERNAL_SIGNED_URL_EXPIRY_MS = PRESIGNED_URL_EXPIRY * 1000;
export const STORAGE_UPLOAD_PATH = "media/r2/storage/upload";
export const STORAGE_DOWNLOAD_PATH = "media/r2/storage/download";
export const STORAGE_UPLOAD_ROUTE = `/api/v1/${STORAGE_UPLOAD_PATH}`;
export const STORAGE_DOWNLOAD_ROUTE = `/api/v1/${STORAGE_DOWNLOAD_PATH}`;
