import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import { PLUGIN_KEY } from "../../constants.js";
import isInside from "../../utils/is-inside.js";

/** Writes a file at a path within the build folder, refusing paths that leave it. */
const writeStaticFile = async (
	outDir: string,
	file: string,
	content: string,
) => {
	const target = path.join(outDir, file);
	if (target === outDir || !isInside(outDir, target)) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${target}' is outside the build folder.`,
		});
	}

	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, content);
};

export default writeStaticFile;
