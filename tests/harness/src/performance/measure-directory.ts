import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";

export type DirectorySize = {
	bytes: number;
	/** The size of its scripts once gzipped, which is closer to what is uploaded or downloaded. */
	gzipBytes: number;
	files: number;
};

/** Adds up the files under a folder, leaving out source maps and anything under `exclude`. */
const measureDirectory = async (
	directory: string,
	options?: { exclude?: string },
): Promise<DirectorySize> => {
	const size: DirectorySize = { bytes: 0, gzipBytes: 0, files: 0 };
	const entries = await readdir(directory, {
		recursive: true,
		withFileTypes: true,
	});

	for (const entry of entries) {
		const file = path.join(entry.parentPath, entry.name);
		if (
			!entry.isFile() ||
			entry.name.endsWith(".map") ||
			(options?.exclude && file.startsWith(`${options.exclude}${path.sep}`))
		) {
			continue;
		}

		const content = await readFile(file);
		size.bytes += content.byteLength;
		size.files++;
		if (/\.m?js$/.test(entry.name)) {
			size.gzipBytes += gzipSync(content).byteLength;
		}
	}

	return size;
};

export default measureDirectory;
