import T from "../../../translations/index.js";
import { LucidError } from "../../../utils/errors/index.js";
import packageJson from "../../../../package.json" with { type: "json" };
import semver from "semver";

const checkPluginVersion = (data: {
	key: string;
	requiredVersions: string;
	lucidVersion?: string;
}) => {
	const useVersion = data.lucidVersion ?? packageJson.version;
	const lucidVersion = semver.coerce(useVersion) ?? useVersion;

	if (!semver.satisfies(lucidVersion, data.requiredVersions)) {
		throw new LucidError({
			scope: data.key,
			message: T("plugin_version_not_supported", {
				version: lucidVersion as string,
				supportedVersions: data.requiredVersions,
			}),
		});
	}
};

export default checkPluginVersion;
