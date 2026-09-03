import { LucidError } from "@lucidcms/core/runtime";
import prepareAstro from "./services/prepare-astro.js";

type AstroAdapter = {
	name: string;
};

/** Build-time integration for Astro running on Node. */
const nodeAstroIntegration = {
	validateAdapter(adapter: AstroAdapter | undefined) {
		if (!adapter?.name.toLowerCase().includes("node")) {
			throw new LucidError({
				message:
					"The Lucid Node runtime requires an Astro Node adapter. Add @astrojs/node to astro.config.*.",
			});
		}
	},
	prepare: prepareAstro,
};

export default nodeAstroIntegration;
