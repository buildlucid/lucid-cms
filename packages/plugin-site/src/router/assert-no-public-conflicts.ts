import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SitePage, SitePublicFile } from "../types.js";
import limitDetails from "../utils/limit-details.js";
import routeKey from "../utils/route-key.js";
import getPageFile from "./get-page-file.js";
import isDynamicPattern from "./is-dynamic-pattern.js";

/**
 * Rejects static-page paths that conflict with public files, checking both route and build output
 * paths with request encoding. Runs on site load in development and before build writes.
 */
const assertNoPublicConflicts = (
	pages: ReadonlyArray<SitePage>,
	publicFiles: ReadonlyArray<SitePublicFile>,
) => {
	const files = new Map(
		publicFiles.map((file) => [routeKey(file.path), file.file]),
	);

	const conflicts = pages.flatMap((page) => {
		if (isDynamicPattern(page.pattern)) return [];

		const paths = new Set([
			page.pattern,
			getPageFile(page.pattern, page.contentType),
		]);
		return [...paths].flatMap((path) => {
			const file = files.get(routeKey(path));
			return file ? [`'${path}': '${page.template}' and '${file}'`] : [];
		});
	});
	if (conflicts.length === 0) return;

	throw new LucidError({
		scope: PLUGIN_KEY,
		message: `These pages share a path with a public file, so runtimes would differ in which one they serve. Remove one of each:\n${limitDetails(conflicts).join("\n")}`,
	});
};

export default assertNoPublicConflicts;
