import path from "node:path";
import type { Jiti, NodeModule } from "jiti";
import { getNativeConfigFiles } from "./with-config-loader.js";

/** Returns the cached module graph rooted at a loaded config entry. */
const getConfigModuleGraph = (entryPath: string, cache: Jiti["cache"]) => {
	const modules = new Set<string>();
	const visit = (module: NodeModule | undefined) => {
		if (!module || modules.has(module.filename)) return;
		modules.add(module.filename);
		for (const child of module.children) visit(child);
	};

	visit(cache[entryPath]);
	return modules;
};

/** Loads a config module and optionally reports its local dependencies. */
const loadConfigModule = async <T>(props: {
	loader: Jiti;
	specifier: string;
	dependencyEntryPath?: string;
}) => {
	const dependencyEntryPath = props.dependencyEntryPath;
	const module = await props.loader.import<T>(props.specifier);
	const moduleGraph = dependencyEntryPath
		? getConfigModuleGraph(dependencyEntryPath, props.loader.cache)
		: new Set<string>();

	const dependencies = dependencyEntryPath
		? Array.from(
				new Set([...moduleGraph, ...getNativeConfigFiles(props.loader)]),
			).filter(
				(modulePath) =>
					modulePath !== dependencyEntryPath &&
					!modulePath.includes(`${path.sep}node_modules${path.sep}`) &&
					!modulePath.endsWith(".d.ts"),
			)
		: [];

	return { module, dependencies };
};

export default loadConfigModule;
