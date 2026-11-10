import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

/** Reads a JSON file the harness wrote, trusting it has the shape its writer gave it. */
export const readJson = async <T>(file: string): Promise<T> =>
	JSON.parse(await readFile(file, "utf8")) as T;

/** Writes a JSON file, creating its folder first. */
export const writeJson = async (
	file: string,
	value: unknown,
): Promise<void> => {
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, `${JSON.stringify(value, null, "\t")}\n`);
};
