import type { Extensions, JSONContent } from "@tiptap/core";

export type RichTextJSON = JSONContent;

export const richTextNodeNames = {
	media: "lucidMedia",
	variable: "lucidVariable",
	embeddedBrick: "lucidEmbeddedBrick",
} as const;

export type RichTextHydratedMedia =
	| {
			type: "image";
			src: string;
			alt: string;
	  }
	| {
			type: "audio";
			src: string;
	  }
	| {
			type: "video";
			src: string;
			poster: string | null;
	  };

export type RichTextEmbeddedBrick = {
	ref: string;
	key: string;
	fields?: unknown;
};

export type RichTextRenderers = {
	bricks?: (props: {
		node: RichTextJSON;
		brick: RichTextEmbeddedBrick;
	}) => string;
};

export type RichTextRenderOptions = {
	bricks?: readonly RichTextEmbeddedBrick[] | null;
	/** Additional or replacement Tiptap extensions used by the static renderer. */
	extensions?: Extensions;
	renderers?: RichTextRenderers;
};
