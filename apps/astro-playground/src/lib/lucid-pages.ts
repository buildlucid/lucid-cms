import getToolkit from "@lucidcms/astro/toolkit";

const PAGE_COLLECTION_KEY = "page";
const PAGE_STATUS = "latest";

type LucidField = {
	value?: unknown;
};

type LucidMediaRef = {
	id: number;
	url: string;
	title?: Record<string, string>;
	alt?: Record<string, string>;
	width?: number | null;
	height?: number | null;
};

type LucidClientDocument = {
	id: number;
	fields?: Record<string, LucidField> | null;
	refs?: {
		media?: Array<LucidMediaRef | null>;
	} | null;
};

export type PlaygroundPage = {
	id: number;
	fullSlug: string;
	title: string;
	bodyHtml: string;
	thumbnail: {
		url: string;
		alt: string;
		width: number | null;
		height: number | null;
	} | null;
};

const getFieldValue = (
	document: LucidClientDocument,
	key: string,
): string | null => {
	const value = document.fields?.[key]?.value;
	return typeof value === "string" ? value : null;
};

const getUnknownFieldValue = (
	document: LucidClientDocument,
	key: string,
): unknown => {
	return document.fields?.[key]?.value;
};

const escapeHtml = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const renderRichTextMarks = (
	text: string,
	marks: Array<Record<string, unknown>> | undefined,
): string => {
	return (marks ?? []).reduce((content, mark) => {
		switch (mark.type) {
			case "bold":
				return `<strong>${content}</strong>`;
			case "italic":
				return `<em>${content}</em>`;
			case "underline":
				return `<u>${content}</u>`;
			case "strike":
				return `<s>${content}</s>`;
			case "code":
				return `<code>${content}</code>`;
			case "link": {
				const href =
					typeof mark.attrs === "object" &&
					mark.attrs !== null &&
					"href" in mark.attrs &&
					typeof mark.attrs.href === "string"
						? mark.attrs.href
						: null;
				return href ? `<a href="${escapeHtml(href)}">${content}</a>` : content;
			}
			default:
				return content;
		}
	}, text);
};

const renderRichTextNode = (node: unknown): string => {
	if (typeof node !== "object" || node === null) {
		return "";
	}

	const type =
		"type" in node && typeof node.type === "string" ? node.type : null;
	const text =
		"text" in node && typeof node.text === "string" ? node.text : null;
	const content =
		"content" in node && Array.isArray(node.content) ? node.content : [];
	const marks =
		"marks" in node && Array.isArray(node.marks)
			? (node.marks as Array<Record<string, unknown>>)
			: undefined;
	const renderedChildren = content.map(renderRichTextNode).join("");

	if (text !== null) {
		return renderRichTextMarks(escapeHtml(text), marks);
	}

	switch (type) {
		case "doc":
			return renderedChildren;
		case "paragraph":
			return renderedChildren.trim() ? `<p>${renderedChildren}</p>` : "";
		case "heading": {
			const level =
				"attrs" in node &&
				typeof node.attrs === "object" &&
				node.attrs !== null &&
				"level" in node.attrs &&
				typeof node.attrs.level === "number"
					? Math.min(6, Math.max(1, node.attrs.level))
					: 2;
			return `<h${level}>${renderedChildren}</h${level}>`;
		}
		case "bulletList":
			return `<ul>${renderedChildren}</ul>`;
		case "orderedList":
			return `<ol>${renderedChildren}</ol>`;
		case "listItem":
			return `<li>${renderedChildren}</li>`;
		case "blockquote":
			return `<blockquote>${renderedChildren}</blockquote>`;
		case "codeBlock":
			return `<pre><code>${renderedChildren}</code></pre>`;
		case "hardBreak":
			return "<br />";
		case "horizontalRule":
			return "<hr />";
		default:
			return renderedChildren;
	}
};

const renderRichTextHtml = (value: unknown): string => {
	const html = renderRichTextNode(value);

	return html.trim()
		? html
		: "<p>This page was loaded through the Lucid client document endpoint.</p>";
};

const getMediaIds = (document: LucidClientDocument, key: string): number[] => {
	const value = getUnknownFieldValue(document, key);
	if (!Array.isArray(value)) return [];

	return value.filter((item): item is number => typeof item === "number");
};

const getMediaRef = (
	document: LucidClientDocument,
	key: string,
): PlaygroundPage["thumbnail"] => {
	const [mediaId] = getMediaIds(document, key);
	if (!mediaId) return null;

	const mediaRef = document.refs?.media?.find((ref) => ref?.id === mediaId);
	if (!mediaRef) return null;

	return {
		url: mediaRef.url,
		alt:
			mediaRef.alt?.en ??
			mediaRef.title?.en ??
			getFieldValue(document, "page_title") ??
			"Page image",
		width: mediaRef.width ?? null,
		height: mediaRef.height ?? null,
	};
};

const mapPageDocument = (document: LucidClientDocument): PlaygroundPage => {
	const fullSlug = getFieldValue(document, "fullSlug") ?? "/";

	return {
		id: document.id,
		fullSlug,
		title: getFieldValue(document, "page_title") ?? "Untitled page",
		bodyHtml: renderRichTextHtml(getUnknownFieldValue(document, "page_body")),
		thumbnail: getMediaRef(document, "thumbnail"),
	};
};

export const getAllPages = async (): Promise<PlaygroundPage[]> => {
	const toolkit = await getToolkit();
	const response = await toolkit.documents.getMultiple({
		collectionKey: PAGE_COLLECTION_KEY,
		status: PAGE_STATUS,
		query: {
			perPage: 100,
			sort: [
				{
					key: "updatedAt",
					value: "asc",
				},
			],
		},
	});

	if (response.error) {
		throw new Error(response.error.message ?? "Failed to load Lucid pages.");
	}

	const uniquePages = new Map<string, PlaygroundPage>();

	for (const page of response.data.data.map(mapPageDocument)) {
		if (page.fullSlug !== "/" && !page.fullSlug.startsWith("/")) {
			continue;
		}

		if (!uniquePages.has(page.fullSlug)) {
			uniquePages.set(page.fullSlug, page);
		}
	}

	return [...uniquePages.values()];
};

export const getPageByFullSlug = async (
	fullSlug: string,
): Promise<PlaygroundPage | null> => {
	const toolkit = await getToolkit();

	const response = await toolkit.documents.getSingle({
		collectionKey: PAGE_COLLECTION_KEY,
		status: PAGE_STATUS,
		query: {
			filter: {
				_fullSlug: {
					value: fullSlug,
				},
			},
		},
	});

	if (response.error?.status === 404) {
		return null;
	}

	if (response.error) {
		throw new Error(response.error.message ?? "Failed to load a Lucid page.");
	}

	return mapPageDocument(response.data);
};
