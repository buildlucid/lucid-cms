import { readFile, writeFile } from "node:fs/promises";

/** Writes a file only when its content has changed. */
const writeFileIfChanged = async (filePath: string, content: string) => {
	try {
		if ((await readFile(filePath, "utf-8")) === content) return;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}

	await writeFile(filePath, content);
};

export default writeFileIfChanged;
