import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { paths } from "../utils/paths.ts";
import { MODES, type Setup, type SetupDefinition } from "./types.ts";

/** Loads one setup by its folder name. */
export const loadSetup = async (name: string): Promise<Setup> => {
	const directory = path.join(paths.setups, name);
	const definitionPath = path.join(directory, "setup.ts");
	if (!existsSync(definitionPath)) {
		throw new Error(`Setup "${name}" has no setup.ts in ${directory}.`);
	}

	const module = (await import(pathToFileURL(definitionPath).href)) as {
		default: SetupDefinition;
	};

	return {
		modes: MODES,
		capabilities: {},
		...module.default,
		name,
		directory,
		configPath: path.join(directory, "lucid.config.ts"),
	};
};

/** Loads every folder in `setups`, in name order. */
export const loadSetups = async (): Promise<Setup[]> => {
	const entries = await readdir(paths.setups, { withFileTypes: true });
	const names = entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();

	return Promise.all(names.map(loadSetup));
};
