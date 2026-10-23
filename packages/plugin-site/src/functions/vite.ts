import { safe } from "@lucidkiln/core";
import { VITE_CLIENT } from "../constants.js";
import type { SiteData, ViteManifestChunk } from "../types.js";
import escapeHtml from "../utils/escape-html.js";
import formatAttributes, {
	type AttributeValue,
} from "../utils/format-attributes.js";
import normalizeVitePath from "../utils/normalize-vite-path.js";
import { getBuiltChunk } from "./vite-build.js";

export type ViteOptions = {
	/** Added to every tag, such as `{ nonce: cspNonce }`. */
	attrs?: Record<string, AttributeValue>;
};

/** A tag for a file, by its URL path. */
type Tag = { kind: "stylesheet" | "script" | "preload"; url: string };

const STYLESHEET = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/;

const writeTag = (tag: Tag, attributes: string) => {
	const url = escapeHtml(tag.url);
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
	const chunk = getBuiltChunk(manifest, entry);

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
		...[...css].map((file) => ({
			kind: "stylesheet" as const,
			url: `/${file}`,
		})),
		...(isStylesheet
			? []
			: [{ kind: "script" as const, url: `/${chunk.file}` }]),
		...[...imports].map((file) => ({
			kind: "preload" as const,
			url: `/${file}`,
		})),
	];
};

/** In development, Vite's client and the source file, which Vite serves from its path in the Vite root. */
const buildDevTags = (path: string): Tag[] => [
	{ kind: "script", url: VITE_CLIENT },
	{ kind: STYLESHEET.test(path) ? "stylesheet" : "script", url: `/${path}` },
];

/**
 * Writes the tags for Vite entries, given as paths within the site directory: `{{ vite("styles/site.css", "scripts/site.ts") }}`.
 *
 * Paths must be written out, because `lucidcms build` finds them in templates. `attrs` adds attributes to every tag: `vite("scripts/site.ts", attrs: { nonce: cspNonce })`.
 *
 * Each call writes a shared file once. Calls don't skip files earlier calls wrote, because a `cache` section must keep its own tags. Browsers fetch each file and run each module once, however often a page links it.
 */
const createViteFunction =
	(data: SiteData) =>
	(...args: string[] | [...string[], ViteOptions]) => {
		const last = args.at(-1);
		const attributes = formatAttributes(
			typeof last === "object" ? (last.attrs ?? {}) : {},
		);
		const seen = new Set<string>();

		const tags = args.flatMap((entry) => {
			if (typeof entry !== "string") return [];
			const path = data.prefix + normalizeVitePath(entry);
			return data.kind === "dev"
				? buildDevTags(path)
				: buildTags(data.manifest, path);
		});

		return safe(
			tags
				.flatMap((tag) => {
					if (seen.has(tag.url)) return [];
					seen.add(tag.url);
					return [writeTag(tag, attributes)];
				})
				.join(""),
		);
	};

export default createViteFunction;
