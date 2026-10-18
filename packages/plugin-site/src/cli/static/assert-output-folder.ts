import path from "node:path";
import { LucidError } from "@lucidcms/core";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../../constants.js";

const inside = (parent: string, child: string) => {
	const relative = path.relative(parent, child);
	return !relative.startsWith("..") && !path.isAbsolute(relative);
};

/** Refuses folders whose emptying would delete the project or its sources. */
const assertOutputFolder = (props: {
	outDir: string;
	projectRoot: string;
	siteRoot: string;
	publicFiles: Parameters<LucidPluginCommand["run"]>[0]["publicFiles"];
}) => {
	// The site folder is a source wherever the output sits relative to it; public files only when the output holds them.
	const touchesSources =
		inside(props.outDir, props.siteRoot) ||
		inside(props.siteRoot, props.outDir) ||
		props.publicFiles.some((file) => inside(props.outDir, file.path));

	if (
		props.outDir === props.projectRoot ||
		!inside(props.projectRoot, props.outDir) ||
		touchesSources
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `site:build empties '${props.outDir}' first, so it must be its own folder inside the project, apart from the site and public files.`,
		});
	}
};

export default assertOutputFolder;
