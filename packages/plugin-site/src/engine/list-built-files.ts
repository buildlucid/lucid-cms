import type { ViteManifestChunk } from "../types.js";

const cache = new WeakMap<object, ReadonlySet<string>>();

/** Every file Vite wrote for the site, relative to `/_assets/`, from its manifest. */
const listBuiltFiles = (manifest: Record<string, ViteManifestChunk>) => {
	const cached = cache.get(manifest);
	if (cached) return cached;

	const files = new Set(
		Object.values(manifest).flatMap((chunk) => [
			chunk.file,
			...(chunk.css ?? []),
			...(chunk.assets ?? []),
		]),
	);
	cache.set(manifest, files);
	return files;
};

export default listBuiltFiles;
