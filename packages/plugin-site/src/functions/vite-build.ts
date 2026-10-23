import type { ViteManifestChunk } from "../types.js";

/** A source file's chunk in Vite's build manifest, failing when the build doesn't have it. */
export const getBuiltChunk = (
	manifest: Record<string, ViteManifestChunk>,
	key: string,
) => {
	const chunk = manifest[key];
	if (!chunk) {
		throw new Error(
			`"${key}" isn't in the site's Vite build. Run lucidcms build again.`,
		);
	}

	return chunk;
};
