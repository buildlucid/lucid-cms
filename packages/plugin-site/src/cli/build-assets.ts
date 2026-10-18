import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import type { LucidPluginCli } from "@lucidcms/core/types";
import { ASSETS_BASE, PLUGIN_KEY } from "../constants.js";
import type { ViteManifestChunk } from "../types.js";
import createViteOptions from "./create-vite-options.js";
import findVitePaths from "./find-vite-paths.js";
import importVite from "./import-vite.js";

type BuildProps = Parameters<NonNullable<LucidPluginCli["build"]>>[0];

const MANIFEST = ".vite/manifest.json";
// Vite needs an entry, so a build of only `viteAsset()` files gets an empty one, removed afterwards.
const EMPTY_ENTRY = "__lucid-empty__.js";

/** Builds what templates pass to `vite()` and `viteAsset()` into `public/assets`, and returns Vite's manifest, or null when there is nothing. */
const buildAssets = async (
	props: BuildProps & { root: string; templates: Record<string, string> },
): Promise<Record<string, ViteManifestChunk> | null> => {
	const { entries, files } = await findVitePaths(props.templates);
	if (entries.length === 0 && files.length === 0) return null;

	const vite = await importVite();
	if (!vite) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"Templates call vite() or viteAsset(), so the site needs Vite to build. Install the vite package.",
		});
	}

	const outDir = path.join(props.outDir, "public", ASSETS_BASE);
	const emptyEntry = path.resolve(props.root, EMPTY_ENTRY);
	await vite.build({
		...createViteOptions({ root: props.root, projectRoot: props.projectRoot }),
		mode: "production",
		logLevel: "warn",
		build: {
			outDir,
			// The output folder holds the project's public files too, and `lucidcms build` empties it anyway.
			emptyOutDir: false,
			assetsDir: "",
			manifest: MANIFEST,
			// vite() links the CSS the manifest attaches to each entry, which one combined stylesheet would bypass.
			cssCodeSplit: true,
			rolldownOptions: {
				input:
					entries.length > 0
						? entries.map((entry) => path.resolve(props.root, entry))
						: [emptyEntry],
			},
		},
		plugins: [
			{
				name: "lucid:site-files",
				resolveId: (id) => (id === emptyEntry ? id : undefined),
				load: (id) => (id === emptyEntry ? "" : undefined),
				// Emitted with their source path, so the manifest lists them for viteAsset().
				async buildStart() {
					for (const file of files) {
						this.emitFile({
							type: "asset",
							name: path.basename(file),
							originalFileName: file,
							source: await readFile(path.resolve(props.root, file)),
						});
					}
				},
			},
		],
	});

	const manifestFile = path.join(outDir, MANIFEST);
	const manifest: Record<string, ViteManifestChunk> = JSON.parse(
		await readFile(manifestFile, "utf8"),
	);
	await rm(path.dirname(manifestFile), { recursive: true, force: true });

	const empty = manifest[EMPTY_ENTRY];
	if (empty) {
		await rm(path.join(outDir, empty.file), { force: true });
		delete manifest[EMPTY_ENTRY];
	}

	return manifest;
};

export default buildAssets;
