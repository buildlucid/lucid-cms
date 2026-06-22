/// <reference types="@cloudflare/workers-types" />

export type PluginOptions = {
	/**
	 * Cloudflare KV binding name. Defaults to "LUCID_KV".
	 */
	binding?: string;
	/**
	 * Wrangler KV namespace id.
	 */
	id?: string;
	/**
	 * Wrangler KV preview namespace id.
	 */
	previewId?: string;
	/**
	 * Prefix all keys with a non-empty namespace. Defaults to "lucid" so clear operations
	 * only delete Lucid-owned keys. Set to false to disable namespacing.
	 */
	namespace?: string | false;
};
