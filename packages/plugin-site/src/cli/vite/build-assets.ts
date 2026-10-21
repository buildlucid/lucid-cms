import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import type { LucidPluginCliHooks } from "@lucidcms/core/types";
import type { PluginOption, Rolldown } from "vite";
import { ASSETS_BASE, PLUGIN_KEY } from "../../constants.js";
import type { ViteManifestChunk } from "../../types.js";
import type { BuiltUi, UiAssets } from "../../ui/site-ui.js";
import {
	hydrationId,
	hydrationName,
	readElementScript,
} from "../ui/hydration-modules.js";
import createViteOptions from "./create-vite-options.js";
import findVitePaths from "./find-vite-paths.js";
import importVite from "./import-vite.js";

type BuildProps = Parameters<NonNullable<LucidPluginCliHooks["build"]>>[0];

const MANIFEST = ".vite/manifest.json";
/** Inlines component stylesheets up to this string length to avoid an extra request. */
const INLINE_STYLES_LIMIT = 4096;
// Vite needs an entry, so a build of only `viteAsset()` files gets an empty one, removed afterwards.
const EMPTY_ENTRY = "__lucid-empty__.js";

/** A hydration chunk's browser files: the chunks it imports, directly or not, and their stylesheets. */
const assetsOf = (
	bundle: Rolldown.OutputBundle,
	chunk: Rolldown.OutputChunk,
): UiAssets => {
	const css = new Set<string>();
	const seen = new Set<string>();
	const visit = (file: string) => {
		const output = bundle[file];
		if (seen.has(file) || output?.type !== "chunk") return;
		seen.add(file);
		for (const sheet of output.viteMetadata?.importedCss ?? []) {
			css.add(ASSETS_BASE + sheet);
		}
		for (const imported of output.imports) visit(imported);
	};
	visit(chunk.fileName);
	seen.delete(chunk.fileName);
	return {
		src: ASSETS_BASE + chunk.fileName,
		preload: [...seen].map((file) => ASSETS_BASE + file),
		css: [...css],
	};
};

/** Builds template and UI browser assets into `assetsDir`, returning the Vite manifest and component files or nulls when no `vite()`, `viteAsset()` or UI entries exist. */
const buildAssets = async (
	props: Pick<BuildProps, "projectRoot" | "publicFiles"> & {
		root: string;
		templates: Record<string, string>;
		/** The folder served at `/_assets/`. */
		assetsDir: string;
		/** The integration rendering each UI component templates name, by name, and the Vite plugins that compile them. */
		ui: { components: Map<string, string>; plugins: PluginOption[] } | null;
	},
): Promise<{
	manifest: Record<string, ViteManifestChunk> | null;
	/** The UI components' browser files, when there are any. */
	ui: BuiltUi | null;
}> => {
	const { entries, files } = await findVitePaths(props.templates);
	const components = props.ui?.components ?? new Map<string, string>();
	const ui: BuiltUi = { script: "", components: {}, styles: {} };
	let element: string | undefined;
	if (entries.length === 0 && files.length === 0 && components.size === 0) {
		return { manifest: null, ui: null };
	}

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
			...(props.ui?.plugins ?? []),
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
					// The browser imports hydration modules itself, so they keep their exports, and the component's name.
					for (const name of components.keys()) {
						this.emitFile({
							type: "chunk",
							id: hydrationId(name),
							name: path.posix.parse(name).name,
							preserveSignature: "exports-only",
						});
					}
					// The element's script is built already, so it is copied as is with a hashed name. As a chunk, Vite would
					// wrap its import() in a preload helper twice its size.
					if (components.size > 0) {
						element = this.emitFile({
							type: "asset",
							name: "client-component.js",
							source: await readElementScript(),
						});
					}
				},
				generateBundle(_options, bundle) {
					if (element) ui.script = ASSETS_BASE + this.getFileName(element);
					for (const output of Object.values(bundle)) {
						if (output.type !== "chunk") continue;
						const name = hydrationName(output.facadeModuleId);
						const integration =
							name === null ? undefined : components.get(name);
						if (name !== null && integration !== undefined) {
							ui.components[name] = {
								...assetsOf(bundle, output),
								integration,
							};
						}
					}
					for (const href of Object.values(ui.components).flatMap(
						(c) => c.css,
					)) {
						const sheet = bundle[href.slice(ASSETS_BASE.length)];
						const text =
							sheet?.type !== "asset"
								? undefined
								: typeof sheet.source === "string"
									? sheet.source
									: new TextDecoder().decode(sheet.source);
						if (
							text !== undefined &&
							text.length <= INLINE_STYLES_LIMIT &&
							!text.includes("</style")
						) {
							ui.styles[href] = text;
						}
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

	return { manifest, ui: components.size > 0 ? ui : null };
};

export default buildAssets;
