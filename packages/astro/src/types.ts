import type { RenderedTemplates } from "@lucidcms/core/types";

export type LucidAstroConfigMeta = {
	emailTemplates?: RenderedTemplates;
};

export type LucidAstroRuntime = "node" | "cloudflare";
