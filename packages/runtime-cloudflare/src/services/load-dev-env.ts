import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseEnv } from "node:util";
import { loadEnv } from "vite";

const readEnvFile = async (file: string) => {
	try {
		return parseEnv(await readFile(file, "utf-8"));
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			return undefined;
		}
		throw error;
	}
};

/** Matches Worker variables for Node config evaluation using the first available `.dev.vars.<mode>` or `.dev.vars` alone, otherwise `.env`, `.env.local`, `.env.<mode>` and `.env.<mode>.local` in order with process variables taking priority. */
const loadDevEnv = async (
	projectRoot: string,
	mode: string,
): Promise<Record<string, unknown>> => {
	for (const file of [`.dev.vars.${mode}`, ".dev.vars"]) {
		const devVars = await readEnvFile(path.join(projectRoot, file));
		if (devVars) return { ...devVars };
	}
	// An empty prefix loads every variable, from the files and the process.
	return loadEnv(mode, projectRoot, "");
};

export default loadDevEnv;
