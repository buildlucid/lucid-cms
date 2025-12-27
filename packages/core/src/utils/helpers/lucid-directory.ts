import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import constants from "../../constants/constants.js";

/**
 * Ensures the .lucid directory exists in the CWD
 */

export const ensureLucidDirectoryExists = async () => {
	const cwd = process.cwd();
	const lucidDir = join(cwd, constants.directories.lucid);

	if (!existsSync(lucidDir)) {
		await mkdir(lucidDir, { recursive: true });
	}

	return lucidDir;
};
