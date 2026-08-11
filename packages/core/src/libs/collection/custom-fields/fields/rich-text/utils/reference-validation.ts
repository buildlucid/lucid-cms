import type { RichTextUserVariableField } from "../../../../../../types/response.js";
import { richTextUserVariableFields } from "../types.js";

export const isReferenceId = (value: unknown): value is number =>
	typeof value === "number" && Number.isInteger(value) && value > 0;

export const collectionIsAllowed = (
	config: boolean | string[] | undefined,
	collectionKey: string,
) =>
	config === true || (Array.isArray(config) && config.includes(collectionKey));

export const isRichTextUserVariableField = (
	value: unknown,
): value is RichTextUserVariableField =>
	typeof value === "string" &&
	richTextUserVariableFields.some((field) => field === value);
