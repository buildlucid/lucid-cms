import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti, type Jiti } from "jiti";

const nativeLoads = new WeakMap<
	Jiti,
	{ roots: Set<string>; files: Set<string> }
>();

/** Includes shared resource locations in the current native-module reload scope. */
export const addConfigSource = (loader: Jiti, source: string) => {
	nativeLoads.get(loader)?.roots.add(source);
};

/** Returns native imports observed during the current config load. */
export const getNativeConfigFiles = (loader: Jiti) =>
	nativeLoads.get(loader)?.files ?? [];

/** Shares module instances during one config load without retaining stale project imports between loads. */
const withConfigLoader = async <T>(
	run: (loader: Jiti) => Promise<T>,
	projectRoot: string,
): Promise<T> => {
	const loader = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: true,
		// Cached CommonJS exports need the same default-import shape as native imports.
		interopDefault: true,
	});
	const previous = new Set(Object.keys(loader.cache));
	const state = { roots: new Set([projectRoot]), files: new Set<string>() };
	nativeLoads.set(loader, state);
	const revision = randomUUID();
	// Jiti delegates .mjs and ESM .js to Node, whose cache is separate from require.cache.
	const hooks = registerHooks({
		resolve(specifier, context, nextResolve) {
			const resolved = nextResolve(specifier, context);
			if (
				!resolved.url.startsWith("file:") ||
				!(
					specifier.startsWith(".") ||
					specifier.startsWith("file:") ||
					path.isAbsolute(specifier)
				)
			)
				return resolved;
			const url = new URL(resolved.url);
			const filename = fileURLToPath(url);
			const parentIsLocal =
				context.parentURL?.startsWith("file:") &&
				new URL(context.parentURL).searchParams.get("lucid-reload") ===
					revision;
			const inSource =
				parentIsLocal ||
				[...state.roots].some((root) => {
					const relative = path.relative(root, filename);
					return (
						relative !== ".." &&
						!relative.startsWith(`..${path.sep}`) &&
						!path.isAbsolute(relative)
					);
				});
			if (!inSource) return resolved;
			state.files.add(filename);
			url.searchParams.set("lucid-reload", revision);
			return { ...resolved, url: url.href };
		},
	});
	try {
		return await run(loader);
	} finally {
		hooks.deregister();
		nativeLoads.delete(loader);
		// Native imports can still depend on CommonJS cache entries after config loading.
		// Reload project files while retaining installed dependencies and their shared exports.
		for (const file of Object.keys(loader.cache))
			if (!previous.has(file) && !file.split(path.sep).includes("node_modules"))
				delete loader.cache[file];
	}
};

export default withConfigLoader;
