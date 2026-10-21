import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import importVite from "./import-vite.js";

/** Loads Vite for the site's `ui` integrations, which compile components with it, failing when it isn't installed. */
const requireViteForUi = async () => {
	const vite = await importVite();
	if (!vite) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"The site plugin's ui integrations compile components with Vite. Install the vite package.",
		});
	}
	return vite;
};

export default requireViteForUi;
