import type { KVNamespace } from "@cloudflare/workers-types";

export type PluginOptions = {
	binding: KVNamespace;
};
