import { pathToFileURL } from "node:url";

/** Imports plugin build modules in the CLI process, for `lucidcms serve`, keyed by plugin key. */
const importPluginModules = async (modules: Record<string, string>) =>
	Object.fromEntries(
		await Promise.all(
			Object.entries(modules).map(
				async ([key, modulePath]) =>
					[key, await import(pathToFileURL(modulePath).href)] as const,
			),
		),
	) as Record<string, unknown>;

export default importPluginModules;
