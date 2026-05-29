import semver from "semver";
import packageJson from "../../../../package.json" with { type: "json" };
import { LucidError } from "../../../utils/errors/index.js";
import { translate } from "../../i18n/index.js";

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
			message: translate.server("core.plugins.version.not.supported", {
				version: lucidVersion as string,
				supportedVersions: data.requiredVersions,
			}),
		});
	}
};

export default checkPluginVersion;
