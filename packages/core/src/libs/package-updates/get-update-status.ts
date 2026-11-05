import gt from "semver/functions/gt.js";
import satisfies from "semver/functions/satisfies.js";
import valid from "semver/functions/valid.js";
import validRange from "semver/ranges/valid.js";
import packageJson from "../../../package.json" with { type: "json" };
import type { DiagnosticPackageStatus } from "../../types/response.js";
import type { LatestPackage } from "./types.js";

/**
 * Compares versions using npm prerelease rules. Returns `needs-core` for incompatible core ranges;
 * ignores invalid ranges.
 */
const getUpdateStatus = (props: {
	installed: string;
	latest: LatestPackage | null;
	/** Defaults to the installed core. */
	coreVersion?: string;
}): DiagnosticPackageStatus => {
	const latest = props.latest;
	if (!latest || !valid(props.installed) || !valid(latest.version)) {
		return "unknown";
	}
	if (!gt(latest.version, props.installed)) return "current";

	const requiresCore = latest.requiresCore;
	if (
		requiresCore &&
		validRange(requiresCore) &&
		!satisfies(props.coreVersion ?? packageJson.version, requiresCore)
	) {
		return "needs-core";
	}
	return "available";
};

export default getUpdateStatus;
