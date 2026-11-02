export const PLUGIN_KEY = "@lucidcms/plugin-typesense";
export const LUCID_VERSION = "0.x.x";
export const COMPONENTS_MODULE = "@lucidcms/plugin-typesense/components";
export const LEASE_MS = 120_000;

export const IMPORT_BATCH_SIZE = 250;

export const REBUILD_ROUTE = "/api/v1/typesense/rebuild";
export const STATUS_ROUTE = "/api/v1/typesense/status";
/** Rebuilds per user within the window. Each one rescans every source. */
export const REBUILD_RATE_LIMIT = 5;
export const REBUILD_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
