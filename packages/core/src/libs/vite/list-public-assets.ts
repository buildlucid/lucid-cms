import { readdir } from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "vite";
import constants from "../../constants/constants.js";
import { getDirName } from "../../utils/helpers/index.js";
import { pathExists } from "../../utils/helpers/resolve-source-path.js";
import type { ResourceFile } from "../resources/types.js";

const corePublicDirectory = path.join(
	getDirName(import.meta.url),
	"../../../",
	constants.directories.public,
);

/** Lists Lucid's own public files and the project's, keyed by public path, with project files overriding Lucid's. */
const listPublicAssets = async (files: ResourceFile[]) => {
	const assets = new Map<string, string>();

	if (await pathExists(corePublicDirectory)) {
		const entries = await readdir(corePublicDirectory, {
			recursive: true,
			withFileTypes: true,
		});
		for (const entry of entries) {
			if (!entry.isFile()) continue;

			const file = path.join(entry.parentPath, entry.name);
			assets.set(
				`/${normalizePath(path.relative(corePublicDirectory, file))}`,
				file,
			);
		}
	}

	for (const file of files) {
		assets.set(`/${normalizePath(file.name).replace(/^\/+/, "")}`, file.path);
	}

	return assets;
};

export default listPublicAssets;
