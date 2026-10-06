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
export type { RichTextReference } from "./references.js";
export {
	extractEmbeddedBrickRefs,
	extractRichTextReferences,
} from "./references.js";
export * from "./types.js";
