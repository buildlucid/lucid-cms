import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { Plugin, Rolldown } from "vite";
import type { ViteManifestChunk } from "../../types.js";
import { hydrationId, hydrationName } from "../../ui/hydration-ids.js";
import type { BuiltUi, UiAssets } from "../../ui/site-ui.js";
import readTemplates from "../read-templates.js";
import findUiComponents from "../ui/find-ui-components.js";
import readElementScript from "../ui/read-element-script.js";
import entryInputs from "./entry-inputs.js";
import findVitePaths from "./find-vite-paths.js";
import type { SiteViteContext, SiteVitePluginApi } from "./types.js";

/** The name of the plugin whose `api` hands `site:build` the client build's output. */
export const SITE_CLIENT_BUILD_PLUGIN_NAME = "lucid:site-client-build";
/** Where the client build writes Vite's manifest when the project doesn't ask for one itself. */
const SITE_MANIFEST = ".vite/lucid-site-manifest.json";
/** Inlines component stylesheets up to this string length to avoid an extra request. */
const INLINE_STYLES_LIMIT = 4096;
/** An empty entry for client builds with no other input, such as `site:build` for a site without scripts or styles. */
const EMPTY_ENTRY_ID = "virtual:lucid/site-empty-entry";
const RESOLVED_EMPTY_ENTRY_ID = `\0${EMPTY_ENTRY_ID}`;

/** Whether a build's input lists no entries, as an array or a record. */
const isEmptyInput = (input: Rolldown.InputOptions["input"]) =>
	input === undefined ||
	(typeof input !== "string" && Object.keys(input).length === 0);

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
			css.add(`/${sheet}`);
		}

		for (const imported of output.imports) visit(imported);
	};

	visit(chunk.fileName);
	seen.delete(chunk.fileName);

	return {
		src: `/${chunk.fileName}`,
		preload: [...seen].map((file) => `/${file}`),
		css: [...css],
	};
};

/** Builds `vite()`, `viteAsset()` and hydration assets in the client environment, saving their manifest as `context.clientBuild` for the subsequent server build to embed. */
const siteClientBuildPlugin = (
	context: SiteViteContext,
): Plugin<SiteVitePluginApi> & { api: SiteVitePluginApi } => {
	const buildId = crypto.randomUUID().slice(0, 16);
	let analysis: {
		entries: string[];
		files: string[];
		components: Map<string, string>;
	} | null = null;
	let manifestFile = SITE_MANIFEST;
	let ownManifest = false;
	let builtUi: BuiltUi | null = null;
	/** The emitted `<client-component>` script, until the bundle names it. */
	let elementScript: string | null = null;

	return {
		name: SITE_CLIENT_BUILD_PLUGIN_NAME,
		apply: "build",
		applyToEnvironment: (environment) => environment.name === "client",
		api: { clientBuild: () => context.clientBuild?.data ?? null },
		async configEnvironment(name, config) {
			if (name !== "client") return;

			const templates = await readTemplates(context.root);
			analysis = {
				...(await findVitePaths(templates)),
				components: context.ui
					? await findUiComponents(templates, context.ui)
					: new Map<string, string>(),
			};

			const manifest = config.build?.manifest;
			ownManifest = !manifest;
			manifestFile =
				typeof manifest === "string"
					? manifest
					: manifest
						? ".vite/manifest.json"
						: SITE_MANIFEST;

			return {
				build: {
					// Vite's manifest maps the files templates name to what the build wrote.
					...(ownManifest ? { manifest: SITE_MANIFEST } : {}),
					rolldownOptions: {
						input: entryInputs(context.root, analysis.entries),
					},
				},
			};
		},
		// Rolldown needs an entry, though the site's files may all be emitted ones or there may be none.
		options(inputOptions) {
			if (!isEmptyInput(inputOptions.input)) return;
			return { ...inputOptions, input: [EMPTY_ENTRY_ID] };
		},
		resolveId: {
			filter: { id: /^virtual:lucid\/site-empty-entry$/ },
			handler: () => RESOLVED_EMPTY_ENTRY_ID,
		},
		load: {
			filter: { id: /^\0virtual:lucid\/site-empty-entry$/ },
			handler: () => "",
		},
		async buildStart() {
			if (!analysis) return;

			// Emitted with their source path, so the manifest lists them for viteAsset().
			for (const file of analysis.files) {
				this.emitFile({
					type: "asset",
					name: path.basename(file),
					originalFileName: context.prefix + file,
					source: await readFile(path.resolve(context.root, file)),
				});
			}

			// The browser imports hydration modules itself, so they keep their exports, and the component's name.
			for (const name of analysis.components.keys()) {
				this.emitFile({
					type: "chunk",
					id: hydrationId(name),
					name: path.posix.parse(name).name,
					preserveSignature: "exports-only",
				});
			}

			// The element's script is built already, so it is copied as is with a hashed name. As a chunk, Vite would
			// wrap its import() in a preload helper twice its size.
			if (analysis.components.size > 0) {
				elementScript = this.emitFile({
					type: "asset",
					name: "client-component.js",
					source: await readElementScript(),
				});
			}
		},
		generateBundle(_options, bundle) {
			// Removed before Vite writes its manifest, which would otherwise list it.
			for (const [fileName, output] of Object.entries(bundle)) {
				if (
					output.type === "chunk" &&
					output.facadeModuleId === RESOLVED_EMPTY_ENTRY_ID
				) {
					delete bundle[fileName];
				}
			}

			if (!analysis || !elementScript) return;
			const ui: BuiltUi = {
				script: `/${this.getFileName(elementScript)}`,
				components: {},
				styles: {},
			};
			builtUi = ui;

			for (const output of Object.values(bundle)) {
				if (output.type !== "chunk") continue;
				const name = hydrationName(output.facadeModuleId);
				if (name !== null && analysis.components.has(name)) {
					ui.components[name] = assetsOf(bundle, output);
				}
			}

			for (const href of Object.values(ui.components).flatMap((c) => c.css)) {
				const sheet = bundle[href.slice(1)];
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
		async writeBundle(options) {
			if (!analysis || !options.dir) return;

			const file = path.join(options.dir, manifestFile);
			const manifest: Record<string, ViteManifestChunk> = JSON.parse(
				await readFile(file, "utf8"),
			);

			// Lucid's own manifest would otherwise be served as a public file.
			if (ownManifest) await rm(file, { force: true });

			context.clientBuild = {
				data: {
					kind: "build",
					buildId,
					prefix: context.prefix,
					manifest,
					ui: analysis.components.size ? builtUi : null,
				},
				components: analysis.components,
			};
		},
	};
};

export default siteClientBuildPlugin;
