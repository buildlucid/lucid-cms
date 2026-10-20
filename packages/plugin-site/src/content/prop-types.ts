import type {
	ContentBrick,
	ContentDocument,
	LocalizedMedia,
} from "@lucidcms/core/types";
import type { RichTextJSON } from "@lucidcms/rich-text";
import isRecord from "../utils/is-record.js";

/** Checks prop shapes because islands receive copies without their original identity. */
const propTypes = {
	Document: (value: unknown): value is ContentDocument<string, true> =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.collectionKey === "string" &&
		isRecord(value.fields),
	Brick: (value: unknown): value is ContentBrick =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.key === "string" &&
		isRecord(value.fields) &&
		!("collectionKey" in value),
	Media: (value: unknown): value is LocalizedMedia =>
		isRecord(value) &&
		typeof value.id === "number" &&
		typeof value.type === "string" &&
		typeof value.key === "string" &&
		typeof value.url === "string",
	RichText: (value: unknown): value is RichTextJSON =>
		isRecord(value) &&
		typeof value.type === "string" &&
		(value.content === undefined || Array.isArray(value.content)),
};

export default propTypes;
