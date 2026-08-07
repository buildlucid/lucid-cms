import { LucidError } from "@lucidcms/core";
import type { RuntimeAdapter } from "@lucidcms/core/types";
import prepareAstro from "./services/prepare-astro.js";
import type { CloudflareRuntimeAdapter } from "./types.js";

type AstroAdapter = {
	name: string;
};

/** Build-time Astro bridge for the Cloudflare runtime. */
const cloudflareAstroIntegration = {
	vite: {
		aliases: {
			"cross-fetch": "cross-fetch/dist/browser-ponyfill.js",
		},
	},
	validateAdapter(adapter: AstroAdapter | undefined) {
		if (!adapter?.name.toLowerCase().includes("cloudflare")) {
			throw new LucidError({
				message:
					"The Lucid Cloudflare runtime requires @astrojs/cloudflare in astro.config.*.",
			});
		}
	},
	prepare: prepareAstro,
	async teardown({ adapter }: { adapter: RuntimeAdapter }) {
		const runtime = adapter as CloudflareRuntimeAdapter;
		const platformProxy = runtime.getPlatformProxy();
		runtime.setPlatformProxy(undefined);
		await platformProxy?.dispose?.();
	},
};

export default cloudflareAstroIntegration;
