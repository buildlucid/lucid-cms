import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileLoader } from "@lucidkiln/core/node";
import { TEMPLATE_EXTENSION } from "../constants.js";

/** Reads every template in the site directory, keyed by path, for the server bundle. */
const readTemplates = async (root: string): Promise<Record<string, string>> => {
	const names = (await fileLoader({ root }).list()).filter((name) =>
		name.endsWith(TEMPLATE_EXTENSION),
	);

	return Object.fromEntries(
		await Promise.all(
			names.map(async (name) => [
				name,
				await readFile(path.join(root, name), "utf8"),
			]),
		),
	);
};

export default readTemplates;
