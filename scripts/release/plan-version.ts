import { ANY_VERSION, DEPENDENCY_FIELDS } from "./constants.ts";
import type { VersionChange, Workspace } from "./types.ts";

/**
 * Lists package and dependency versions that differ from the shared version, for release updates
 * and consistency checks.
 */
const planVersion = (
	workspace: Workspace,
	version: string,
): VersionChange[] => {
	const changes: VersionChange[] = [];

	for (const manifest of workspace.manifests) {
		if (manifest.versioned && manifest.json.version !== version) {
			changes.push({
				path: manifest.path,
				field: "version",
				from: manifest.json.version,
				to: version,
			});
		}

		for (const field of DEPENDENCY_FIELDS) {
			for (const [name, range] of Object.entries(manifest.json[field] ?? {})) {
				if (!workspace.versionedNames.has(name)) {
					continue;
				}
				if (range === ANY_VERSION || range === version) {
					continue;
				}

				changes.push({
					path: manifest.path,
					field: `${field}.${name}`,
					from: range,
					to: version,
				});
			}
		}
	}

	return changes;
};

export default planVersion;
