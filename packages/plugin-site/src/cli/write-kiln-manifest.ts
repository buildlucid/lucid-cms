import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { generateManifest, memoryLoader } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../constants.js";
import createSiteConfig from "../site/create-site-config.js";
import createSiteKiln from "../site/create-site-kiln.js";
import type { SitePluginOptionsInternal } from "../types.js";
import type { ResolvedIntegrations } from "./ui/resolve-integrations.js";

/** The `client` prop every UI component takes, which editors complete alongside its own props. */
const CLIENT_PROP = `{ client?: "load" | "idle" | "visible" | "only" | { media: string } }`;

/**
 * Writes `kiln.json` into the site directory so editors can check templates against the site's functions, and
 * complete UI components' names and props.
 */
const writeKilnManifest = async (props: {
	root: string;
	config: ResolvedLucidConfig;
	options: SitePluginOptionsInternal;
	ui: ResolvedIntegrations | null;
}) => {
	try {
		// The manifest only lists names, so this Kiln never loads templates or reads content.
		const kiln = createSiteKiln({
			loader: memoryLoader({}),
			config: createSiteConfig(props.config, props.options, null),
			options: props.options,
			data: null,
			lookupTranslation: () => undefined,
		});
		const file = path.join(props.root, "kiln.json");
		const manifest = generateManifest(kiln, {
			root: ".",
			components: (props.ui?.list ?? []).map(
				({ extensions, filter, props }) => ({
					extensions,
					...(filter.include && { include: filter.include }),
					...(filter.exclude && { exclude: filter.exclude }),
					props: props ? `(${props}) & ${CLIENT_PROP}` : CLIENT_PROP,
				}),
			),
		});
		const current = await readFile(file, "utf8").catch(() => null);
		if (current !== manifest) await writeFile(file, manifest);
	} catch (error) {
		logger.warn({
			scope: PLUGIN_KEY,
			event: "plugin-site.manifest.failed",
			dedupeKey: `${PLUGIN_KEY}:manifest-failed`,
			message: `Couldn't write kiln.json into ${props.root}, so editors can't check templates against the site's functions.`,
			error,
		});
	}
};

export default writeKilnManifest;
