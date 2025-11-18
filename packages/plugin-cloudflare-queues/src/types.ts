import type { Queue } from "@cloudflare/workers-types";

export type PluginOptions = {
	namespace: Queue;
};
