import type { CollectionDocument, DocumentRef } from "@lucidcms/types";
import type { Extensions, JSONContent } from "@tiptap/core";

export type RichTextJSON = JSONContent;

export type RichTextVariableSource = "document" | "user";

export const richTextNodeNames = {
	document: "lucidDocument",
	media: "lucidMedia",
	variable: "lucidVariable",
	embeddedBrick: "lucidEmbeddedBrick",
} as const;

export type RichTextHydratedImagePreset = {
	key: string;
	src: string;
	mimeType: string;
	width: number | null;
	height: number | null;
};

export type RichTextHydratedImage = {
	src: string;
	alt: string;
	title: string;
	mimeType: string;
	width: number | null;
	height: number | null;
	base64: string | null;
	averageColor: string | null;
	presets: RichTextHydratedImagePreset[];
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

export type RichTextElementRendererProps<Element extends string = string> = {
	element: Element;
	node: RichTextJSON;
	mark?: RichTextRenderMark;
	children: string;
	defaultHTML: string;
};

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

export type RichTextFallbackRenderer<
	TDocument extends CollectionDocument = CollectionDocument,
> = (props: RichTextFallbackRendererProps<TDocument>) => string;

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

export type RichTextRenderOptions<
	TDocument extends CollectionDocument = CollectionDocument,
> = {
	/** Source document used to resolve document and embedded-brick nodes. */
	document?: TDocument | null;
	/** Additional or replacement Tiptap extensions used by the static renderer. */
	extensions?: Extensions;
	renderers?: RichTextRenderers<TDocument>;
};
