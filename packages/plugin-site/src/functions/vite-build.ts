import type { SiteCliData, ViteManifestChunk } from "../types.js";

/** The site's Vite setup for `vite()` and `viteAsset()`, failing when Vite isn't installed. */
export const requireVite = (data: SiteCliData | null, name: string) => {
	if (!data || (data.kind === "dev" && !data.vite)) {
		throw new Error(
			`${name}() needs Vite. Install the vite package and restart the server.`,
		);
	}
	return data;
};

/** A source file's chunk in Vite's build manifest, failing when the build doesn't have it. */
export const getBuiltChunk = (
	manifest: Record<string, ViteManifestChunk> | null,
	path: string,
) => {
	const chunk = manifest?.[path];
	if (!chunk) {
		throw new Error(
			`"${path}" isn't in the site's Vite build. Run lucidcms build again.`,
		);
	}
	return chunk;
};
