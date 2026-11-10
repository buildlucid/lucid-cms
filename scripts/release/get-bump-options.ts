import semver from "semver";

export type BumpType = "patch" | "minor" | "major" | "prerelease";

export type BumpOption = {
	type: BumpType;
	version: string;
	description: string;
};

const DESCRIPTIONS: Record<BumpType, string> = {
	patch: "Bug fixes only",
	minor: "New features",
	major: "A milestone release",
	prerelease: "Another build of the current pre-release",
};

/** Calculates release options, stripping pre-release tags before patch, minor and major bumps. */
const getBumpOptions = (current: string): BumpOption[] => {
	const parsed = semver.parse(current);
	if (!parsed) {
		throw new Error(`"${current}" is not a valid version.`);
	}

	const stable = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
	const types: BumpType[] =
		parsed.prerelease.length > 0
			? ["patch", "minor", "major", "prerelease"]
			: ["patch", "minor", "major"];

	return types.flatMap((type) => {
		const version = semver.inc(type === "prerelease" ? current : stable, type);
		return version ? [{ type, version, description: DESCRIPTIONS[type] }] : [];
	});
};

export default getBumpOptions;
