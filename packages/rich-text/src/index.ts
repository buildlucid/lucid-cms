export type { StarterKitOptions as RichTextStarterKitOptions } from "@tiptap/starter-kit";
export {
	extensions,
	LucidEmbeddedBrick,
	LucidLink,
	LucidMedia,
	LucidVariable,
	mergeExtensions,
} from "./extensions.js";
export { extractEmbeddedBrickRefs } from "./references.js";
export { renderRichTextHTML, resolveRichTextDocumentPath } from "./render.js";
export * from "./types.js";
