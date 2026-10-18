import { logger } from "@lucidcms/core";
import { generateManifest } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteKiln } from "./create-site-kiln.js";

const writeKilnManifest = async (directory: string, kiln: SiteKiln) => {
	try {
		const [{ readFile, writeFile }, path] = await Promise.all([
			import("node:fs/promises"),
			import("node:path"),
		]);
		const file = path.join(directory, "kiln.json");
		const manifest = generateManifest(kiln, { root: "." });
		const current = await readFile(file, "utf8").catch(() => null);
		if (current !== manifest) await writeFile(file, manifest);
	} catch (error) {
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.manifest.failed",
			dedupeKey: `${PLUGIN_KEY}:manifest-failed`,
			message: `Couldn't write kiln.json into ${directory}, so editors can't check templates against the site's functions.`,
			error,
		});
	}
};

export default writeKilnManifest;
