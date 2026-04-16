export const LUCID_ASTRO_INTEGRATION_NAME = "@lucidcms/astro";
export const ASTRO_CONFIGURE_LUCID_MODULE_ID =
	"@lucidcms/astro/configure-lucid";
export const LUCID_ASTRO_DEV_ASSET_PLUGIN_NAME = `${LUCID_ASTRO_INTEGRATION_NAME}:assets-dev`;
export const LUCID_ASTRO_BUILD_ASSET_PLUGIN_NAME = `${LUCID_ASTRO_INTEGRATION_NAME}:assets-build`;

export const LUCID_MOUNT_PATH = "/lucid";
export const LUCID_WORKER_DIR = ".lucid/astro";
export const LUCID_ASSET_DIRNAME = "lucid-public";
export const ASTRO_CLIENT_DIRNAME = "client";

export const LUCID_INDEX_HTML_FILENAME = "index.html";
export const LUCID_EMAIL_TEMPLATES_MODULE_FILENAME =
	"lucid-email-templates.generated.ts";
export const LUCID_SPA_HTML_MODULE_FILENAME = "lucid-spa-html.generated.ts";
export const LUCID_NODE_ROUTE_FILENAME = "lucid-node.route.ts";
export const LUCID_CLOUDFLARE_ROUTE_FILENAME = "lucid-cloudflare.route.ts";
export const LUCID_EMAIL_TEMPLATES_JSON_FILENAME = "email-templates.json";
export const LUCID_WORKER_FILENAME = "worker.ts";
export const TYPESCRIPT_FILE_EXTENSION = ".ts";

export const WORKER_EXPORT_ARTIFACT_TYPE = "worker-export";
export const WORKER_ENTRY_ARTIFACT_TYPE = "worker-entry";

export const ASTRO_DEV_ORIGIN = "http://astro.local";
export const DEFAULT_BINARY_CONTENT_TYPE = "application/octet-stream";
export const HTML_CONTENT_TYPE = "text/html; charset=utf-8";
export const NO_STORE_CACHE_CONTROL = "no-store";
export const CONTENT_TYPE_HEADER = "Content-Type";

export const CROSS_FETCH_ALIAS_KEY = "cross-fetch";
export const CROSS_FETCH_BROWSER_ENTRY = "cross-fetch/dist/browser-ponyfill.js";

export const CLOUDFLARE_RUNTIME_ENV_GLOBAL = "__LUCID_ASTRO_CLOUDFLARE_ENV__";
export const CLOUDFLARE_DEV_ENV_GLOBAL = "__LUCID_ASTRO_CLOUDFLARE_DEV_ENV__";

export const DEFAULT_REMOTE_ADDRESS = "127.0.0.1";

export const HTTP_STATUS_OK = 200;
export const HTTP_STATUS_NOT_FOUND = 404;
export const HTTP_METHOD_GET = "GET";
export const HTTP_METHOD_HEAD = "HEAD";
export const SPA_SHELL_METHODS = [HTTP_METHOD_GET, HTTP_METHOD_HEAD] as const;

export const LUCID_NON_SPA_PREFIXES = [
	`${LUCID_MOUNT_PATH}/api`,
	`${LUCID_MOUNT_PATH}/cdn`,
	`${LUCID_MOUNT_PATH}/documentation`,
	`${LUCID_MOUNT_PATH}/openapi`,
	`${LUCID_MOUNT_PATH}/share`,
] as const;
