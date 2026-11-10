import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
	DEPENDENT_FOLDERS,
	LEAD_PACKAGE,
	VERSIONED_FOLDERS,
} from "./constants.ts";
import type { Manifest, PackageJson, Workspace } from "./types.ts";

const readFolder = (
	root: string,
	folder: string,
	versioned: boolean,
): Manifest[] => {
	const directory = path.join(root, folder);
	if (!existsSync(directory)) {
		return [];
	}

	return readdirSync(directory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => path.join(folder, entry.name, "package.json"))
		.filter((file) => existsSync(path.join(root, file)))
		.map((file) => ({
			path: file,
			versioned,
			json: JSON.parse(
				readFileSync(path.join(root, file), "utf8"),
			) as PackageJson,
		}));
};

/** Reads every `package.json` the release touches and the version they currently share. */
const readWorkspace = (root: string): Workspace => {
	const manifests = [
		...VERSIONED_FOLDERS.flatMap((folder) => readFolder(root, folder, true)),
		...DEPENDENT_FOLDERS.flatMap((folder) => readFolder(root, folder, false)),
	];

	const lead = manifests.find(
		(manifest) => manifest.json.name === LEAD_PACKAGE,
	);
	if (!lead?.json.version) {
		throw new Error(`Could not find ${LEAD_PACKAGE} or its version.`);
	}

	return {
		version: lead.json.version,
		manifests,
		versionedNames: new Set(
			manifests
				.filter((manifest) => manifest.versioned && manifest.json.name)
				.map((manifest) => manifest.json.name as string),
		),
	};
};

export default readWorkspace;
