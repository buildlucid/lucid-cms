import type { BuiltSiteData } from "../../types.js";

/** Lists client files a static site needs relative to output, including template entries and assets, UI browser files, and their static and dynamic imports. */
const listSiteFiles = (data: BuiltSiteData) => {
	const files = new Set<string>();
	const seen = new Set<string>();

	const visit = (key: string) => {
		const chunk = data.manifest[key];
		if (!chunk || seen.has(key)) return;

		seen.add(key);
		files.add(chunk.file);

		for (const file of [...(chunk.css ?? []), ...(chunk.assets ?? [])]) {
			files.add(file);
		}

		for (const imported of [
			...(chunk.imports ?? []),
			...(chunk.dynamicImports ?? []),
		]) {
			visit(imported);
		}
	};

	for (const key of Object.keys(data.manifest)) {
		if (key.startsWith(data.prefix)) visit(key);
	}

	if (data.ui) {
		files.add(data.ui.script.slice(1));

		// Hydration modules are keyed by their virtual module in the manifest, so they're found by their file.
		const keys = new Map(
			Object.entries(data.manifest).map(([key, chunk]) => [chunk.file, key]),
		);

		for (const assets of Object.values(data.ui.components)) {
			for (const url of [assets.src, ...assets.preload, ...assets.css]) {
				files.add(url.slice(1));
			}

			const key = keys.get(assets.src.slice(1));
			if (key) visit(key);
		}
	}

	return files;
};

export default listSiteFiles;
