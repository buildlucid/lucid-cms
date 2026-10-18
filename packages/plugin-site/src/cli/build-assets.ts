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

/** Builds `vite()` and `viteAsset()` files into `assetsDir`, returning Vite's manifest or null when none exist. */
const buildAssets = async (
	props: Pick<BuildProps, "projectRoot" | "publicFiles"> & {
		root: string;
		templates: Record<string, string>;
		/** The folder served at `/_assets/`. */
		assetsDir: string;
	},
): Promise<Record<string, ViteManifestChunk> | null> => {
	const { entries, files } = await findVitePaths(props.templates);
	if (entries.length === 0 && files.length === 0) return null;

	const clash = props.publicFiles.find((file) =>
		file.name.startsWith(ASSETS_BASE.slice(1)),
	);
	if (clash) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `The public file "${clash.path}" is served from ${ASSETS_BASE}, which belongs to the site's built assets. Move it to another folder.`,
		});
	}

	const vite = await importVite();
	if (!vite) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"Templates call vite() or viteAsset(), so the site needs Vite to build. Install the vite package.",
		});
	}

	const emptyEntry = path.resolve(props.root, EMPTY_ENTRY);
	await vite.build({
		...createViteOptions({ root: props.root, projectRoot: props.projectRoot }),
		mode: "production",
		logLevel: "warn",
		build: {
			outDir: props.assetsDir,
			// The output folder holds the project's public files too, and `lucidcms build` empties it anyway.
			emptyOutDir: false,
			assetsDir: "",
			manifest: MANIFEST,
			// vite() links the CSS the manifest attaches to each entry, which one combined stylesheet would bypass.
			cssCodeSplit: true,
			rolldownOptions: {
				// Built files are cached for a year, so every name carries a content hash whatever the project's config says.
				output: {
					entryFileNames: "[name]-[hash].js",
					chunkFileNames: "[name]-[hash].js",
					assetFileNames: "[name]-[hash][extname]",
				},
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

	const manifestFile = path.join(props.assetsDir, MANIFEST);
	const manifest: Record<string, ViteManifestChunk> = JSON.parse(
		await readFile(manifestFile, "utf8"),
	);
	await rm(path.dirname(manifestFile), { recursive: true, force: true });

	const empty = manifest[EMPTY_ENTRY];
	if (empty) {
		await rm(path.join(props.assetsDir, empty.file), { force: true });
		delete manifest[EMPTY_ENTRY];
	}

	return manifest;
};

export default buildAssets;
