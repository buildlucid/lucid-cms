import { readFile, writeFile } from "node:fs/promises";

/** Preserves existing files and their timestamps when their contents have not changed. */
const writeFileIfChanged = async (
	filePath: string,
	content: string | Buffer,
) => {
	const next = typeof content === "string" ? Buffer.from(content) : content;

	try {
		if ((await readFile(filePath)).equals(next)) return;
	} catch (error) {
		if (
			!(error instanceof Error) ||
			!("code" in error) ||
			error.code !== "ENOENT"
		)
			throw error;
	}

	await writeFile(filePath, next);
};

export default writeFileIfChanged;
