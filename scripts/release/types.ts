import type { DEPENDENCY_FIELDS } from "./constants.ts";

export type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

export type PackageJson = {
	name?: string;
	version?: string;
	private?: boolean;
} & Partial<Record<DependencyField, Record<string, string>>>;

/** A `package.json` in the repository, with what is needed to write it back unchanged. */
export type Manifest = {
	/** Path from the repository root, such as `packages/core/package.json`. */
	path: string;
	/** True when the package shares the lead package's version. */
	versioned: boolean;
	json: PackageJson;
};

export type Workspace = {
	/** The lead package's current version. */
	version: string;
	manifests: Manifest[];
	/** Names of the packages that share one version. */
	versionedNames: Set<string>;
};

/** One value the release changes or the check reports. */
export type VersionChange = {
	path: string;
	/** `version`, or a dependency such as `peerDependencies.@lucidcms/core`. */
	field: string;
	from: string | undefined;
	to: string;
};
