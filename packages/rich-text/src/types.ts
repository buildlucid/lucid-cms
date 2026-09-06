import type { CollectionDocument, DocumentRef, Refs } from "@lucidcms/types";
import type { Extensions, JSONContent } from "@tiptap/core";

/** Tiptap JSON document stored by Lucid rich-text fields. */
export type RichTextJSON = JSONContent;

export type RichTextVariableSource = "document" | "user";

export const richTextNodeNames = {
	document: "lucidDocument",
	media: "lucidMedia",
	variable: "lucidVariable",
	embeddedBrick: "lucidEmbeddedBrick",
} as const;

export type RichTextHydratedImage = {
	src: string;
	alt: string;
	title: string;
	mimeType: string;
	width: number | null;
	height: number | null;
	base64: string | null;
	averageColor: string | null;
};

export type RichTextHydratedMedia =
	| ({ type: "image" } & RichTextHydratedImage)
	| {
			type: "audio";
			src: string;
			title: string;
			mimeType: string;
	  }
	| {
			type: "video";
			src: string;
			title: string;
			mimeType: string;
			poster: RichTextHydratedImage | null;
	  }
	| {
			type: "document" | "archive" | "unknown";
			src: string;
			title: string;
			fileName: string;
			mimeType: string;
	  };

export type RichTextRenderMark = NonNullable<RichTextJSON["marks"]>[number];

export type RichTextRenderBrick<
	TDocument extends CollectionDocument = CollectionDocument,
> = NonNullable<TDocument["bricks"]>[number];

export type RichTextRenderDocument<
	TDocument extends CollectionDocument = CollectionDocument,
> = TDocument | DocumentRef;

export type RichTextElement =
	| "root"
	| "paragraph"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5"
	| "h6"
	| "blockquote"
	| "bulletList"
	| "orderedList"
	| "listItem"
	| "codeBlock"
	| "hardBreak"
	| "horizontalRule"
	| "text"
	| "bold"
	| "italic"
	| "strike"
	| "underline"
	| "code"
	| "link"
	| "document"
	| "media"
	| "variable"
	| "brick";

/** Node or mark being rendered, its rendered children and Lucid's default HTML. */
export type RichTextElementRendererProps<Element extends string = string> = {
	element: Element;
	node: RichTextJSON;
	mark?: RichTextRenderMark;
	/** HTML already rendered for child nodes. */
	children: string;
	/** Default markup for this element, including its children. */
	defaultHTML: string;
};

/** Return replacement HTML for one element. Escape any untrusted values you add to the markup. */
export type RichTextElementRenderer<Element extends string = string> = (
	props: RichTextElementRendererProps<Element>,
) => string;

export type RichTextFallbackRendererProps<
	TDocument extends CollectionDocument = CollectionDocument,
> = RichTextElementRendererProps & {
	document?: RichTextRenderDocument<TDocument> | null;
	media?: RichTextHydratedMedia | null;
	value?: string | number | boolean | null;
	brick?: RichTextRenderBrick<TDocument> | null;
};

/** Return HTML for elements without a more specific renderer. */
export type RichTextFallbackRenderer<
	TDocument extends CollectionDocument = CollectionDocument,
> = (props: RichTextFallbackRendererProps<TDocument>) => string;

/** Optional HTML renderers keyed by element type. Unspecified elements use Lucid's defaults. */
export type RichTextRenderers<
	TDocument extends CollectionDocument = CollectionDocument,
> = {
	root?: RichTextElementRenderer<"root">;
	paragraph?: RichTextElementRenderer<"paragraph">;
	h1?: RichTextElementRenderer<"h1">;
	h2?: RichTextElementRenderer<"h2">;
	h3?: RichTextElementRenderer<"h3">;
	h4?: RichTextElementRenderer<"h4">;
	h5?: RichTextElementRenderer<"h5">;
	h6?: RichTextElementRenderer<"h6">;
	blockquote?: RichTextElementRenderer<"blockquote">;
	bulletList?: RichTextElementRenderer<"bulletList">;
	orderedList?: RichTextElementRenderer<"orderedList">;
	listItem?: RichTextElementRenderer<"listItem">;
	codeBlock?: RichTextElementRenderer<"codeBlock">;
	hardBreak?: RichTextElementRenderer<"hardBreak">;
	horizontalRule?: RichTextElementRenderer<"horizontalRule">;
	text?: RichTextElementRenderer<"text">;
	bold?: RichTextElementRenderer<"bold">;
	italic?: RichTextElementRenderer<"italic">;
	strike?: RichTextElementRenderer<"strike">;
	underline?: RichTextElementRenderer<"underline">;
	code?: RichTextElementRenderer<"code">;
	link?: RichTextElementRenderer<"link">;
	document?: (
		props: RichTextElementRendererProps<"document"> & {
			document: RichTextRenderDocument<TDocument> | null;
		},
	) => string;
	media?: (
		props: RichTextElementRendererProps<"media"> & {
			media: RichTextHydratedMedia | null;
		},
	) => string;
	variable?: (
		props: RichTextElementRendererProps<"variable"> & {
			value: string | number | boolean | null;
		},
	) => string;
	brick?: (
		props: RichTextElementRendererProps<"brick"> & {
			brick: RichTextRenderBrick<TDocument> | null;
		},
	) => string;
	/** Handles any node or mark without a more specific renderer. */
	fallback?: RichTextFallbackRenderer<TDocument>;
};

/** Source document, shared refs and rendering overrides for generateHTML. */
export type RichTextRenderOptions<
	TDocument extends CollectionDocument = CollectionDocument,
> = {
	/** Source document used to resolve document and embedded-brick nodes. */
	document?: TDocument | null;
	/** Shared refs registry returned alongside the source document. */
	refs?: Refs;
	/** Additional or replacement Tiptap extensions used by the static renderer. */
	extensions?: Extensions;
	/** Override HTML for selected elements, or provide a fallback. */
	renderers?: RichTextRenderers<TDocument>;
};
