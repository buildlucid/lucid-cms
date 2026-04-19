import { LucidError } from "@lucidcms/core";
import type { RuntimeAdapter } from "@lucidcms/core/types";
import type { AstroAdapter } from "astro";
import type { LucidAstroRuntime } from "../types.js";

/**
 * Astro hosting currently depends on runtime-specific Lucid adapters, so we
 * fail early instead of generating routes that cannot ever boot correctly.
 */
export const detectLucidRuntime = (
	adapter: RuntimeAdapter | undefined,
): LucidAstroRuntime => {
	if (!adapter) {
		throw new LucidError({
			message:
				'Lucid Astro integration requires `configureLucid({ adapter: { module: "@lucidcms/node-adapter" }, database: { module: "..." }, config })` or `@lucidcms/cloudflare-adapter` in lucid.config.ts.',
		});
	}

	if (adapter.key === "node" || adapter.key === "cloudflare") {
		return adapter.key;
	}

	throw new LucidError({
		message: `Lucid Astro integration does not support the "${adapter.key}" runtime adapter yet.`,
	});
};

/**
 * Astro adapters do not expose a runtime enum, so adapter name matching keeps
 * the compatibility check lightweight and local to the integration.
 */
export const detectAstroRuntime = (
	astroAdapter: AstroAdapter | undefined,
): LucidAstroRuntime | null => {
	if (!astroAdapter) {
		return null;
	}

	const adapterName = astroAdapter.name.toLowerCase();

	if (adapterName.includes("cloudflare")) {
		return "cloudflare";
	}

	if (adapterName.includes("node")) {
		return "node";
	}

	return null;
};

/**
 * Lucid and Astro need to agree on the host runtime or their bootstrapped env,
 * request context and build outputs will drift in hard-to-debug ways.
 */
export const assertAstroCompatibility = (
	lucidRuntime: LucidAstroRuntime,
	astroAdapter: AstroAdapter | undefined,
): LucidAstroRuntime => {
	const astroRuntime = detectAstroRuntime(astroAdapter);

	if (!astroRuntime) {
		throw new LucidError({
			message:
				"Lucid Astro integration requires an Astro adapter. Add `@astrojs/node` or `@astrojs/cloudflare` to astro.config.*.",
		});
	}

	if (astroRuntime !== lucidRuntime) {
		throw new LucidError({
			message: `Lucid is configured for the "${lucidRuntime}" runtime, but Astro is using the "${astroRuntime}" adapter. These runtimes must match.`,
		});
	}

	return astroRuntime;
};
