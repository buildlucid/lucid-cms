import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	type HtmlTagDescriptor,
	normalizePath,
	type Plugin,
	type Rolldown,
} from "vite";
import { adminRoot } from "../config.js";
import renderAdminDocument, {
	type AdminDocumentIcons,
} from "./render-admin-document.js";
import serializeTag from "./serialize-tag.js";

/** The admin's client entry, built into the host's client environment. */
export const adminEntry = path.join(adminRoot, "src/index.tsx");

/** Where a build writes the admin's document, served for `/admin/` navigations. */
export const adminDocumentFileName = "admin/index.html";

/** The admin's icon files, keyed as `AdminDocumentIcons` names them. */
export const adminIconFiles: AdminDocumentIcons = {
	ico: path.join(adminRoot, "src/assets/favicon.ico"),
	svg: path.join(adminRoot, "src/assets/favicon.svg"),
	appleTouch: path.join(adminRoot, "src/assets/apple-touch-icon.png"),
};

const iconKeys = ["ico", "svg", "appleTouch"] as const satisfies ReadonlyArray<
	keyof AdminDocumentIcons
>;

/** Collects the chunks an entry loads statically, so the document can preload them and link their CSS. */
const collectStaticChunks = (
	bundle: Rolldown.OutputBundle,
	entry: Rolldown.OutputChunk,
) => {
	const chunks = new Set<Rolldown.OutputChunk>();
	const visit = (chunk: Rolldown.OutputChunk) => {
		if (chunks.has(chunk)) return;
		chunks.add(chunk);

		for (const fileName of chunk.imports) {
			const imported = bundle[fileName];
			if (imported?.type === "chunk") visit(imported);
		}
	};

	visit(entry);
	return [...chunks];
};

/** Emits the admin's document in client builds, linking the built entry, its CSS and its icons. */
const adminDocumentPlugin = (props: {
	tags: () => HtmlTagDescriptor[];
}): Plugin => {
	const iconRefs = new Map<keyof AdminDocumentIcons, string>();

	return {
		name: "lucid:admin-document",
		apply: "build",
		applyToEnvironment: (environment) => environment.name === "client",
		async buildStart() {
			for (const key of iconKeys) {
				const file = adminIconFiles[key];
				iconRefs.set(
					key,
					this.emitFile({
						type: "asset",
						name: path.basename(file),
						source: await readFile(file),
					}),
				);
			}
		},
		generateBundle(_, bundle) {
			const entry = Object.values(bundle).find(
				(output): output is Rolldown.OutputChunk =>
					output.type === "chunk" &&
					output.isEntry &&
					// Module IDs use forward slashes, including on Windows.
					output.facadeModuleId === normalizePath(adminEntry),
			);
			if (!entry) {
				this.error("The admin's entry is missing from the client build.");
			}

			const base = this.environment.config.base;
			const url = (fileName: string) => `${base}${fileName}`;
			const iconUrl = (key: keyof AdminDocumentIcons) => {
				const ref = iconRefs.get(key);
				if (!ref) this.error(`The admin's ${key} icon was not emitted.`);
				return url(this.getFileName(ref));
			};

			const chunks = collectStaticChunks(bundle, entry);
			const head = [
				...new Set(
					chunks.flatMap((chunk) => [
						...(chunk.viteMetadata?.importedCss ?? []),
					]),
				),
			]
				.map((file) => `<link rel="stylesheet" href="${url(file)}">`)
				.concat(
					chunks
						.filter((chunk) => chunk !== entry)
						.map(
							(chunk) =>
								`<link rel="modulepreload" href="${url(chunk.fileName)}">`,
						),
					`<script type="module" crossorigin src="${url(entry.fileName)}"></script>`,
					props.tags().map(serializeTag),
				)
				.join("\n    ");

			this.emitFile({
				type: "asset",
				fileName: adminDocumentFileName,
				source: renderAdminDocument({
					icons: {
						ico: iconUrl("ico"),
						svg: iconUrl("svg"),
						appleTouch: iconUrl("appleTouch"),
					},
					head,
				}),
			});
		},
	};
};

export default adminDocumentPlugin;
