import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEPENDENCY_FIELDS } from "./constants.ts";
import type { PackageJson, VersionChange } from "./types.ts";

/** Writes planned changes to their `package.json` files, keeping key order and tab indentation. */
const applyVersion = (root: string, changes: VersionChange[]) => {
	const byPath = Map.groupBy(changes, (change) => change.path);

	for (const [file, fileChanges] of byPath) {
		const absolute = path.join(root, file);
		const json = JSON.parse(readFileSync(absolute, "utf8")) as PackageJson;

		for (const change of fileChanges) {
			if (change.field === "version") {
				json.version = change.to;
				continue;
			}

			const field = DEPENDENCY_FIELDS.find((item) =>
				change.field.startsWith(`${item}.`),
			);
			const dependencies = field && json[field];
			if (field && dependencies) {
				dependencies[change.field.slice(field.length + 1)] = change.to;
			}
		}

		writeFileSync(absolute, `${JSON.stringify(json, null, "\t")}\n`);
	}
};

export default applyVersion;
