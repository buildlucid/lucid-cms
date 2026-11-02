export type { StarterKitOptions as RichTextStarterKitOptions } from "@tiptap/starter-kit";
export {
	extensions,
	LucidDocument,
	LucidEmbeddedBrick,
	LucidLink,
	LucidMedia,
	LucidMention,
	LucidVariable,
	mergeExtensions,
} from "./extensions/index.js";
export type {
	RichTextReference,
	RichTextReferenceMapper,
	RichTextReferenceTarget,
} from "./references.js";
export {
	extractEmbeddedBrickRefs,
	extractRichTextReferences,
	mapRichTextReferences,
	removeRichTextEmbeddedBricks,
} from "./references.js";
export * from "./types.js";
