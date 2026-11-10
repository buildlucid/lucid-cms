import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/filesystem";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const DEFAULT_UPLOAD_DIRECTORY = "uploads";
export const FILE_SYSTEM_UPLOAD_PATH = "fs/upload";
export const FILE_SYSTEM_DOWNLOAD_PATH = "fs/download";
export const FILE_SYSTEM_UPLOAD_ROUTE = `/api/v1/${FILE_SYSTEM_UPLOAD_PATH}`;
export const FILE_SYSTEM_DOWNLOAD_ROUTE = `/api/v1/${FILE_SYSTEM_DOWNLOAD_PATH}`;
export const FILE_SYSTEM_RATE_LIMIT = 20;
export const FILE_SYSTEM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
