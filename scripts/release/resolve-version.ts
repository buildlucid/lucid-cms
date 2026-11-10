import semver from "semver";
import getBumpOptions from "./get-bump-options.ts";

/**
 * Resolves a bump or exact version, rejecting invalid versions and those not newer than the
 * current one.
 */
const resolveVersion = (current: string, input: string): string => {
	const option = getBumpOptions(current).find((item) => item.type === input);
	const version = option?.version ?? semver.valid(input);

	if (!version) {
		throw new Error(
			`"${input}" is not a version or one of patch, minor, major, prerelease.`,
		);
	}
	if (!semver.gt(version, current)) {
		throw new Error(`${version} is not newer than ${current}.`);
	}

	return version;
};

export default resolveVersion;
