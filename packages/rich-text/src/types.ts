import type { Extensions, JSONContent } from "@tiptap/core";

export type RichTextJSON = JSONContent;

export const richTextNodeNames = {
	media: "lucidMedia",
	variable: "lucidVariable",
	embeddedBrick: "lucidEmbeddedBrick",
} as const;

export type RichTextDocumentReference = {
	id: number;
	collectionKey: string;
	/** Supports both internal field objects and flattened content API values. */
	fields: Record<string, unknown> | null;
};

export type RichTextMediaReference = {
	id: number;
	type: string;
	title: Record<string, string | null>;
	alt?: Record<string, string | null>;
	description?: Record<string, string | null>;
	file: {
		url: string;
		[key: string]: unknown;
	};
	poster?: {
		file?: {
			url?: string;
			[key: string]: unknown;
		};
	} | null;
};

/** The normal Lucid refs object; rich text does not create its own ref bucket. */
export type RichTextReferences = {
	media?: readonly RichTextMediaReference[];
	relation?: readonly RichTextDocumentReference[];
	documents?: readonly RichTextDocumentReference[];
	[key: string]: readonly unknown[] | undefined;
};

export type RichTextEmbeddedBrick = {
	ref: string;
	key: string;
	fields?: unknown;
};

/** A route registered by Lucid config and exposed through collection metadata. */
export type RichTextContentRoute = {
	key: string;
	collectionKey: string;
	path: {
		field: string;
		prefix?: string;
	};
	label?: {
		fields: string[];
	};
};

export type RichTextRenderers = {
	documentLink?: (props: {
		children: string;
		href: string;
		collectionKey: string;
		documentId: number;
		routeKey: string;
		route: RichTextContentRoute;
		reference: RichTextDocumentReference;
		openInNewTab: boolean;
	}) => string;
	media?: (props: {
		mediaId: number;
		reference: RichTextMediaReference;
	}) => string;
	variable?: (props: {
		collectionKey: string;
		documentId: number;
		fieldKey: string;
		reference: RichTextDocumentReference;
		value: unknown;
	}) => string;
	embeddedBrick?: (props: {
		ref: string;
		brick: RichTextEmbeddedBrick;
	}) => string;
};

export type RichTextRenderOptions = {
	refs?: RichTextReferences | null;
	bricks?: readonly RichTextEmbeddedBrick[] | null;
	routes?: readonly RichTextContentRoute[] | null;
	locale?: string;
	/** Additional or replacement Tiptap extensions used by the static renderer. */
	extensions?: Extensions;
	renderers?: RichTextRenderers;
};
