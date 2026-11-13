import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import type { SiteStaticFile } from "../../types.js";

/** A file path from the build folder's root, such as `/sitemap.xml`, with no segment that is empty or leaves the folder. */
const isFilePath = (path: string) =>
	path.startsWith("/") &&
	!path.includes("\\") &&
	path
		.slice(1)
		.split("/")
		.every((segment) => segment !== "" && segment !== "." && segment !== "..");

/**
 * Checks the files `site.staticFiles` hooks gave and leaves out those at a path the build already
 * writes, so the site's own pages and public files win.
 */
const resolveHookFiles = (props: {
	files: ReadonlyArray<SiteStaticFile>;
	/** Paths of the pages the build rendered and the public files it copied. */
	taken: ReadonlySet<string>;
}): SiteStaticFile[] => {
	const seen = new Set<string>();

	return props.files.filter((file) => {
		if (!isFilePath(file.path)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `A site.staticFiles hook gave '${file.path}', which isn't a file path inside the build folder. Use a path such as '/sitemap.xml'.`,
			});
		}
		if (seen.has(file.path)) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `site.staticFiles hooks gave '${file.path}' more than once.`,
			});
		}
		seen.add(file.path);

		return !props.taken.has(file.path);
	});
};

export default resolveHookFiles;
