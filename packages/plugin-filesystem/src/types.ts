import type { FileSystemStorageAdapterOptions } from "@lucidcms/core/types";

/** Local media storage settings. Omission uses the uploads directory and the configured encryption secret. */
export type PluginOptions = Partial<FileSystemStorageAdapterOptions>;
