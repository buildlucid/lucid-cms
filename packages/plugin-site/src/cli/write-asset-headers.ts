import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import mergeAssetHeaders from "./merge-asset-headers.js";

const readExisting = async (file: string) => {
	try {
		return await readFile(file, "utf8");
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return "";
		}
		throw error;
	}
};

/** Adds caching for built assets to `public/_headers`, which Workers static assets apply without running the worker. */
const writeAssetHeaders = async (outDir: string) => {
	const file = path.join(outDir, "public", "_headers");
	await writeFile(file, mergeAssetHeaders(await readExisting(file)));
};

export default writeAssetHeaders;
