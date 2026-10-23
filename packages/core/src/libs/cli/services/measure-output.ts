import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

/** Measures files under `directory` and gzips scripts, excluding source maps and `exclude` paths such as nested client output. */
const measureOutput = async (directory: string, exclude?: string) => {
	let size = 0;
	let gzipSize = 0;
	const entries = await readdir(directory, {
		recursive: true,
		withFileTypes: true,
	});
	for (const entry of entries) {
		if (!entry.isFile() || entry.name.endsWith(".map")) continue;
		const file = path.join(entry.parentPath, entry.name);
		if (exclude && file.startsWith(`${exclude}${path.sep}`)) continue;

		const content = await readFile(file);
		size += content.byteLength;
		if (/\.m?js$/.test(entry.name)) gzipSize += gzipSync(content).byteLength;
	}
	return { size, gzipSize };
};

export default measureOutput;
