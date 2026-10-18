import { LucidError } from "@lucidcms/core";
import { createKiln, memoryLoader } from "@lucidkiln/core";
import { PLUGIN_KEY } from "../../constants.js";
import propTypes from "../../content/prop-types.js";
import normalizeVitePath from "../../utils/normalize-vite-path.js";

/** Function names whose paths the build collects: entries for `vite()` and single files for `viteAsset()`. */
const kinds = new Map<string, "entries" | "files">([
	["vite", "entries"],
	["viteAsset", "files"],
]);

/** Lists the paths templates pass to `vite()` and `viteAsset()`, which must be literals so the build can find them. */
const findVitePaths = async (templates: Record<string, string>) => {
	const kiln = createKiln({
		loader: memoryLoader(templates),
		types: propTypes,
	});
	const paths = { entries: new Set<string>(), files: new Set<string>() };

	for (const name of Object.keys(templates)) {
		const analysis = await kiln.analyze(name);
		for (const call of analysis.calls) {
			const kind = kinds.get(call.name);
			if (!kind) continue;

			for (const arg of call.args) {
				if (arg.name !== null) continue;
				if (!arg.literal || typeof arg.value !== "string") {
					throw new LucidError({
						scope: PLUGIN_KEY,
						message: `${name}:${call.start.line}: ${call.name}() only takes written-out paths, such as ${call.name}("styles/site.css"), so the build can find them.`,
					});
				}
				try {
					paths[kind].add(normalizeVitePath(arg.value));
				} catch (error) {
					throw new LucidError({
						scope: PLUGIN_KEY,
						message: `${name}:${call.start.line}: ${error instanceof Error ? error.message : String(error)}`,
					});
				}
			}
		}
	}

	return { entries: [...paths.entries], files: [...paths.files] };
};

export default findVitePaths;
