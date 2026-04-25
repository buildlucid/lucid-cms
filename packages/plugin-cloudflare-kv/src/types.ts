/// <reference types="@cloudflare/workers-types" />

export type PluginOptions = {
	binding: KVNamespace;
	/**
	 * Prefix all keys with a non-empty namespace. Defaults to "lucid" so clear operations
	 * only delete Lucid-owned keys. Set to false to disable namespacing.
	 */
	namespace?: string | false;
};
