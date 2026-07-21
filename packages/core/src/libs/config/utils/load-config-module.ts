import path from "node:path";
import type { Jiti, NodeModule } from "jiti";

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

/** Imports a module and clears cache entries created by that import. */
const importModule = async <T>(props: {
	loader: Jiti;
	specifier: string;
	clearCache: boolean;
	onLoad?: () => void;
}) => {
	const cachedModules = props.clearCache
		? new Set(Object.keys(props.loader.cache))
		: undefined;
	try {
		const module = await props.loader.import<T>(props.specifier);
		props.onLoad?.();
		return module;
	} finally {
		if (cachedModules) {
			for (const modulePath of Object.keys(props.loader.cache)) {
				if (!cachedModules.has(modulePath)) {
					delete props.loader.cache[modulePath];
				}
			}
		}
	}
};

/** Loads a config module and optionally reports its local dependencies. */
const loadConfigModule = async <T>(props: {
	loader: Jiti;
	specifier: string;
	dependencyEntryPath?: string;
	clearCache?: boolean;
}) => {
	const dependencyEntryPath = props.dependencyEntryPath;
	let moduleGraph = new Set<string>();
	const module = await importModule<T>({
		loader: props.loader,
		specifier: props.specifier,
		clearCache: props.clearCache ?? false,
		onLoad: dependencyEntryPath
			? () => {
					moduleGraph = getConfigModuleGraph(
						dependencyEntryPath,
						props.loader.cache,
					);
				}
			: undefined,
	});
	const dependencies = dependencyEntryPath
		? Array.from(moduleGraph).filter(
				(modulePath) =>
					modulePath !== dependencyEntryPath &&
					!modulePath.includes(`${path.sep}node_modules${path.sep}`) &&
					!modulePath.endsWith(".d.ts"),
			)
		: [];

	return { module, dependencies };
};

export default loadConfigModule;
