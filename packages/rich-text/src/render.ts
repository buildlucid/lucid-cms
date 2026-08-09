import { isAllowedUri } from "@tiptap/extension-link";
import {
	escapeHTML,
	escapeHTMLAttribute,
} from "@tiptap/static-renderer/json/html-string";
import { renderToHTMLString } from "@tiptap/static-renderer/pm/html-string";
import { mergeExtensions } from "./extensions.js";
import {
	type RichTextContentRoute,
	type RichTextDocumentReference,
	type RichTextEmbeddedBrick,
	type RichTextJSON,
	type RichTextMediaReference,
	type RichTextRenderOptions,
	richTextNodeNames,
} from "./types.js";

const documentReferenceKey = (collectionKey: string, documentId: number) =>
	`${collectionKey}\0${documentId}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const getLocalizedFieldValue = (
	values: Record<string, unknown>,
	locale?: string,
): unknown =>
	(locale ? values[locale] : undefined) ??
	Object.values(values).find((value) => value !== undefined);

const getTranslatedValue = (
	value: Record<string, string | null> | undefined,
	locale?: string,
): string => {
	if (!value) return "";
	if (locale && typeof value[locale] === "string") return value[locale] ?? "";
	return (
		Object.values(value).find(
			(item): item is string => typeof item === "string",
		) ?? ""
	);
};

const getDocumentFieldValue = (
	reference: RichTextDocumentReference,
	fieldKey: string,
	locale?: string,
): unknown => {
	const field = reference.fields?.[fieldKey];
	if (!isRecord(field)) return field;

	if ("value" in field || "translations" in field) {
		return isRecord(field.translations)
			? (getLocalizedFieldValue(field.translations, locale) ?? field.value)
			: field.value;
	}

	return getLocalizedFieldValue(field, locale);
};

const joinRoutePath = (prefix: string | undefined, value: string): string => {
	const path = value.trim();
	if (!path) return "";

	const segments = [prefix, path]
		.filter((segment): segment is string => typeof segment === "string")
		.map((segment) => segment.replace(/^\/+|\/+$/g, ""))
		.filter(Boolean);

	return segments.length === 0 ? "/" : `/${segments.join("/")}`;
};

/** Resolves a registered route against a hydrated document reference. */
export const resolveRichTextDocumentPath = (props: {
	route: RichTextContentRoute;
	reference: RichTextDocumentReference;
	locale?: string;
}): string => {
	const rawValue = getDocumentFieldValue(
		props.reference,
		props.route.path.field,
		props.locale,
	);
	if (typeof rawValue !== "string" && typeof rawValue !== "number") return "";
	return joinRoutePath(props.route.path.prefix, String(rawValue));
};

const defaultMediaRenderer = (
	reference: RichTextMediaReference,
	locale?: string,
): string => {
	const src = reference.file.url;

	if (reference.type === "image") {
		const alt =
			getTranslatedValue(reference.alt, locale) ||
			getTranslatedValue(reference.title, locale);
		return `<img src="${escapeHTMLAttribute(src)}" alt="${escapeHTMLAttribute(alt)}">`;
	}
	if (reference.type === "audio") {
		return `<audio controls src="${escapeHTMLAttribute(src)}"></audio>`;
	}
	if (reference.type === "video") {
		const poster = reference.poster?.file?.url;
		const posterAttribute = poster
			? ` poster="${escapeHTMLAttribute(poster)}"`
			: "";
		return `<video controls src="${escapeHTMLAttribute(src)}"${posterAttribute}></video>`;
	}

	return "";
};

const renderAnchor = (props: {
	href: string;
	children: string;
	openInNewTab: boolean;
	rel?: string;
}) => {
	const target = props.openInNewTab ? ' target="_blank"' : "";
	const relValue =
		props.rel || (props.openInNewTab ? "noopener noreferrer" : "");
	const rel = relValue ? ` rel="${escapeHTMLAttribute(relValue)}"` : "";
	return `<a href="${escapeHTMLAttribute(props.href)}"${target}${rel}>${props.children}</a>`;
};

/** Renders a document link or falls back to its unlinked children. */
const renderDocumentLink = (props: {
	attrs: Record<string, unknown>;
	children: string;
	options?: RichTextRenderOptions;
	documentReferences: Map<string, RichTextDocumentReference>;
}) => {
	const collectionKey = props.attrs.collectionKey;
	const documentId = props.attrs.documentId;
	const routeKey = props.attrs.routeKey;
	if (
		typeof collectionKey !== "string" ||
		typeof documentId !== "number" ||
		typeof routeKey !== "string"
	) {
		return props.children;
	}

	const reference = props.documentReferences.get(
		documentReferenceKey(collectionKey, documentId),
	);
	if (!reference) return props.children;

	const route = props.options?.routes?.find(
		(item) => item.key === routeKey && item.collectionKey === collectionKey,
	);
	if (!route) return props.children;

	const href = resolveRichTextDocumentPath({
		route,
		reference,
		locale: props.options?.locale,
	});
	if (!href) return props.children;

	const openInNewTab = props.attrs.target === "_blank";
	if (props.options?.renderers?.documentLink) {
		return props.options.renderers.documentLink({
			children: props.children,
			href,
			collectionKey,
			documentId,
			routeKey,
			route,
			reference,
			openInNewTab,
		});
	}

	return renderAnchor({ href, children: props.children, openInNewTab });
};

const renderExternalLink = (
	attrs: Record<string, unknown>,
	children: string,
) => {
	const href = typeof attrs.href === "string" ? attrs.href : "";
	if (!href || !isAllowedUri(href)) return children;

	return renderAnchor({
		href,
		children,
		openInNewTab: attrs.target === "_blank",
		rel: typeof attrs.rel === "string" ? attrs.rel : undefined,
	});
};

const renderLinkMark = (props: {
	attrs: Record<string, unknown>;
	children?: string | string[];
	options?: RichTextRenderOptions;
	documentReferences: Map<string, RichTextDocumentReference>;
}) => {
	const children = Array.isArray(props.children)
		? props.children.join("")
		: (props.children ?? "");

	return props.attrs.kind === "document"
		? renderDocumentLink({ ...props, children })
		: renderExternalLink(props.attrs, children);
};

const renderMediaNode = (props: {
	mediaId: unknown;
	options?: RichTextRenderOptions;
	mediaReferences: Map<number, RichTextMediaReference>;
}) => {
	if (typeof props.mediaId !== "number") return "";
	const reference = props.mediaReferences.get(props.mediaId);
	if (!reference) return "";
	return (
		props.options?.renderers?.media?.({
			mediaId: props.mediaId,
			reference,
		}) ?? defaultMediaRenderer(reference, props.options?.locale)
	);
};

const renderVariableNode = (props: {
	attrs: Record<string, unknown>;
	options?: RichTextRenderOptions;
	documentReferences: Map<string, RichTextDocumentReference>;
}) => {
	const collectionKey = props.attrs.collectionKey;
	const documentId = props.attrs.documentId;
	const fieldKey = props.attrs.fieldKey;
	if (
		typeof collectionKey !== "string" ||
		typeof documentId !== "number" ||
		typeof fieldKey !== "string"
	) {
		return "";
	}

	const reference = props.documentReferences.get(
		documentReferenceKey(collectionKey, documentId),
	);
	if (!reference) return "";

	const value = getDocumentFieldValue(
		reference,
		fieldKey,
		props.options?.locale,
	);
	if (props.options?.renderers?.variable) {
		return props.options.renderers.variable({
			collectionKey,
			documentId,
			fieldKey,
			reference,
			value,
		});
	}

	if (typeof value === "string" || typeof value === "number") {
		return escapeHTML(String(value));
	}
	return typeof value === "boolean" ? String(value) : "";
};

const renderEmbeddedBrickNode = (props: {
	ref: unknown;
	options?: RichTextRenderOptions;
	embeddedBricks: Map<string, RichTextEmbeddedBrick>;
}) => {
	if (typeof props.ref !== "string") return "";
	const brick = props.embeddedBricks.get(props.ref);
	if (!brick || !props.options?.renderers?.embeddedBrick) return "";
	return props.options.renderers.embeddedBrick({ ref: props.ref, brick });
};

/** Renders rich-text JSON to HTML while resolving Lucid reference nodes. */
export const renderRichTextHTML = (
	json: RichTextJSON,
	options?: RichTextRenderOptions,
): string => {
	const documentReferences = new Map<string, RichTextDocumentReference>();
	for (const reference of [
		...(options?.refs?.documents ?? []),
		...(options?.refs?.relation ?? []),
	]) {
		documentReferences.set(
			documentReferenceKey(reference.collectionKey, reference.id),
			reference,
		);
	}
	const mediaReferences = new Map<number, RichTextMediaReference>();
	for (const reference of options?.refs?.media ?? []) {
		mediaReferences.set(reference.id, reference);
	}
	const embeddedBricks = new Map(
		(options?.bricks ?? []).map((brick) => [brick.ref, brick]),
	);

	return renderToHTMLString({
		content: json,
		extensions: mergeExtensions(options?.extensions),
		options: {
			markMapping: {
				link: ({ mark, children }) =>
					renderLinkMark({
						attrs: mark.attrs,
						children,
						options,
						documentReferences,
					}),
			},
			nodeMapping: {
				[richTextNodeNames.media]: ({ node }) =>
					renderMediaNode({
						mediaId: node.attrs.mediaId,
						options,
						mediaReferences,
					}),
				[richTextNodeNames.variable]: ({ node }) =>
					renderVariableNode({
						attrs: node.attrs,
						options,
						documentReferences,
					}),
				[richTextNodeNames.embeddedBrick]: ({ node }) =>
					renderEmbeddedBrickNode({
						ref: node.attrs.ref,
						options,
						embeddedBricks,
					}),
			},
		},
	});
};
