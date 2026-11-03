import packageJson from "../../../package.json" with { type: "json" };
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AdapterRuntimeContext } from "../runtime/types.js";
import type { PackageInfo } from "./types.js";

/**
 * Lists core, runtime, database and plugin packages, deduplicated by name. Admin shares core's
 * version and is omitted.
 */
const getInstalledPackages = (props: {
	config: ResolvedLucidConfig;
	runtimeContext?: AdapterRuntimeContext;
}): PackageInfo[] => {
	const packages = new Map<string, PackageInfo>();
	for (const item of [
		{ name: packageJson.name, version: packageJson.version },
		props.runtimeContext?.package,
		props.config.db.package,
		...props.config.plugins.map((plugin) => plugin.package),
	]) {
		if (item && !packages.has(item.name)) packages.set(item.name, item);
	}
	return [...packages.values()];
};

export default getInstalledPackages;
