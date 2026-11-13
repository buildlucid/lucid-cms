import path from "node:path";
import { pluginPublicDirectory } from "@lucidcms/core/extension";
import type { LucidPluginCliHooks } from "@lucidcms/core/types";
import { normalizePath } from "vite";
import type { SitePublicFile } from "../types.js";

/** The project's public files a page could share a path with, leaving out plugins' own under `_plugins`, which no page routes. */
const listPublicFiles = (
	publicFiles: Parameters<
		NonNullable<LucidPluginCliHooks["vite"]>
	>[0]["publicFiles"],
	projectRoot: string,
): SitePublicFile[] =>
	publicFiles
		.filter((file) => !file.name.startsWith(`${pluginPublicDirectory}/`))
		.map((file) => ({
			path: `/${file.name}`,
			file: normalizePath(path.relative(projectRoot, file.path)),
		}));

export default listPublicFiles;
