import { safe } from "@lucidkiln/core";
import { ASSETS_BASE } from "../../constants.js";
import type { SiteCliData, ViteManifestChunk } from "../../types.js";
import escapeHtml from "../../utils/escape-html.js";
import formatAttributes, {
	type AttributeValue,
} from "../../utils/format-attributes.js";
import normalizeVitePath from "../../utils/normalize-vite-path.js";

export type ViteOptions = {
	/** Added to every tag, such as `{ nonce: cspNonce }`. */
	attrs?: Record<string, AttributeValue>;
};

type Tag = { kind: "stylesheet" | "script" | "preload"; file: string };

const STYLESHEET = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/;

const writeTag = (tag: Tag, attributes: string) => {
	const url = escapeHtml(ASSETS_BASE + tag.file);
	switch (tag.kind) {
		case "stylesheet":
			return `<link rel="stylesheet" href="${url}"${attributes}>`;
		case "script":
			return `<script type="module" src="${url}"${attributes}></script>`;
		case "preload":
			return `<link rel="modulepreload" href="${url}"${attributes}>`;
	}
};

/** An entry's tags in Vite's order: its and its imports' stylesheets, its script, then preloads for its imports. */
const buildTags = (
	manifest: Record<string, ViteManifestChunk>,
	entry: string,
): Tag[] => {
	const chunk = manifest[entry];
	if (!chunk) {
		throw new Error(
			`"${entry}" isn't in the site's Vite build. Run lucidcms build again.`,
		);
	}

	const css = new Set(chunk.css);
	const imports = new Set<string>();
	const visit = (key: string) => {
		const imported = manifest[key];
		if (!imported || imports.has(imported.file)) return;
		imports.add(imported.file);
		for (const file of imported.css ?? []) css.add(file);
		for (const next of imported.imports ?? []) visit(next);
	};
	for (const key of chunk.imports ?? []) visit(key);

	const isStylesheet = STYLESHEET.test(chunk.file);
	if (isStylesheet) css.add(chunk.file);
	return [
		...[...css].map((file) => ({ kind: "stylesheet" as const, file })),
		...(isStylesheet ? [] : [{ kind: "script" as const, file: chunk.file }]),
		...[...imports].map((file) => ({ kind: "preload" as const, file })),
	];
};

/** In development, Vite's client and the source files Vite serves. */
const buildDevTags = (entry: string): Tag[] => [
	{ kind: "script", file: "@vite/client" },
	{ kind: STYLESHEET.test(entry) ? "stylesheet" : "script", file: entry },
];

/**
 * Writes the tags for Vite entries, given as paths within the site directory: `{{ vite("styles/site.css", "scripts/site.ts") }}`.
 *
 * Paths must be written out, because `lucidcms build` finds them in templates. `attrs` adds attributes to every tag: `vite("scripts/site.ts", attrs: { nonce: cspNonce })`.
 *
 * Each call writes a shared file once. Calls don't skip files earlier calls wrote, because a `cache` section must keep its own tags. Browsers fetch each file and run each module once, however often a page links it.
 */
const createViteFunction =
	(data: SiteCliData | null) =>
	(...args: string[] | [...string[], ViteOptions]) => {
		if (!data || (data.mode === "dev" && !data.vite)) {
			throw new Error(
				"vite() needs Vite. Install the vite package and restart the server.",
			);
		}

		const last = args.at(-1);
		const attributes = formatAttributes(
			typeof last === "object" ? (last.attrs ?? {}) : {},
		);
		const seen = new Set<string>();

		const tags = args.flatMap((entry) => {
			if (typeof entry !== "string") return [];
			const path = normalizeVitePath(entry);
			return data.mode === "dev"
				? buildDevTags(path)
				: buildTags(data.manifest ?? {}, path);
		});
		return safe(
			tags
				.flatMap((tag) => {
					if (seen.has(tag.file)) return [];
					seen.add(tag.file);
					return [writeTag(tag, attributes)];
				})
				.join(""),
		);
	};

export default createViteFunction;
