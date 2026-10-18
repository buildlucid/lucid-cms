import isRecord from "../utils/is-record.js";
import type {
	TemplateBrick,
	TemplateDocument,
} from "./to-template-document.js";
import type { TemplateMedia } from "./to-template-media.js";
import type { TemplateRichTextNode } from "./to-template-rich-text.js";

/** Checks prop shapes because islands receive copies without their original identity. */
const templateTypes = {
	Document: (value: unknown): value is TemplateDocument =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.collectionKey === "string" &&
		isRecord(value.fields) &&
		Array.isArray(value.bricks),
	Brick: (value: unknown): value is TemplateBrick =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.key === "string" &&
		isRecord(value.fields) &&
		!("collectionKey" in value),
	Media: (value: unknown): value is TemplateMedia =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.type === "string" &&
		typeof value.key === "string" &&
		typeof value.url === "string",
	RichText: (value: unknown): value is TemplateRichTextNode =>
		isRecord(value) &&
		typeof value.type === "string" &&
		isRecord(value.attrs) &&
		Array.isArray(value.content),
};

export default templateTypes;
