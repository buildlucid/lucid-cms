import { LucidError } from "@lucidcms/core";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../../constants.js";
import isInside from "../../utils/is-inside.js";

/** macOS and Windows disks usually ignore case, so `Site` and `site` name the same folder there. */
const foldCase = (value: string) =>
	process.platform === "darwin" || process.platform === "win32"
		? value.toLowerCase()
		: value;

/** Refuses folders whose emptying would delete the project or its sources. */
const assertOutputFolder = (props: {
	outDir: string;
	projectRoot: string;
	siteRoot: string;
	publicFiles: Parameters<LucidPluginCommand["run"]>[0]["publicFiles"];
}) => {
	const outDir = foldCase(props.outDir);
	const projectRoot = foldCase(props.projectRoot);
	const siteRoot = foldCase(props.siteRoot);
	// The site folder is a source wherever the output sits relative to it; public files only when the output holds them.
	const touchesSources =
		isInside(outDir, siteRoot) ||
		isInside(siteRoot, outDir) ||
		props.publicFiles.some((file) => isInside(outDir, foldCase(file.path)));

	if (
		outDir === projectRoot ||
		!isInside(projectRoot, outDir) ||
		touchesSources
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `site:build empties '${props.outDir}' first, so it must be its own folder inside the project, apart from the site and public files.`,
		});
	}
};

export default assertOutputFolder;
