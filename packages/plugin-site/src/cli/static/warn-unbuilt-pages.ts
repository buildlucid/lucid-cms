import type { Toolkit } from "@lucidcms/core/types";
import listDocumentPaths from "../../content/list-document-paths.js";
import type { Site } from "../../site/create-site-loader.js";
import isLucidPath from "../../utils/is-lucid-path.js";
import normalizePath from "../../utils/normalize-path.js";
import limitDetails from "./limit-details.js";

/** Warns when built links or document URLs point to unbuilt pages, without adding pages. */
const warnUnbuiltPages = async (props: {
	site: Site;
	toolkit: Toolkit;
	collections: string[];
	built: ReadonlySet<string>;
	/** Each link target, with the first built page that links to it. */
	links: ReadonlyMap<string, string>;
	publicPaths: ReadonlySet<string>;
	warn: (message: string, details?: string[]) => void;
}) => {
	const broken = [...props.links]
		.filter(
			([target]) =>
				!props.built.has(target) &&
				!props.publicPaths.has(target) &&
				!isLucidPath(target),
		)
		.map(([target, from]) => `${target} (on ${from})`)
		.sort();
	if (broken.length > 0) {
		props.warn("Links to pages the build didn't make", limitDetails(broken));
	}

	for (const collectionKey of props.collections) {
		const version = props.site.config.siteVersion(collectionKey);
		if (version === null) continue;
		// A check must never fail a build whose pages are already written, such as when a collection the site never reads errors.
		let paths: string[];
		try {
			paths = await listDocumentPaths(
				props.toolkit,
				collectionKey,
				version,
				props.site.config.locales,
			);
		} catch (error) {
			props.warn(
				`Couldn't check the URLs of '${collectionKey}' documents: ${error instanceof Error ? error.message : String(error)}`,
			);
			continue;
		}
		const missing = paths
			.map(normalizePath)
			.filter((routePath) => !props.built.has(routePath));
		if (missing.length > 0) {
			props.warn(
				`${missing.length} '${collectionKey}' documents have URLs the build didn't make, so their live page links will 404`,
				limitDetails(missing),
			);
		}
	}
};

export default warnUnbuiltPages;
