import type { RichTextUserVariableField } from "../../../../../../types/response.js";
import buildTableName from "../../../../helpers/build-table-name.js";
import {
	type RichTextValidationData,
	richTextUserVariableFields,
} from "../types.js";

/** A missing target can remain in content that already referenced it. */
export const hasRetainedDocumentReference = (
	data: RichTextValidationData,
	collectionKey: string,
	documentId: number,
) => {
	const table = buildTableName("document", { collection: collectionKey }, null);
	return (
		!table.error &&
		data.retainedReferences?.documents
			?.get(table.data.name)
			?.has(documentId) === true
	);
};

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
