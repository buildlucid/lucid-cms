import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { CollectionDocumentEditable, DocumentEditable } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsGetEditableInput } from "./types.js";

export type * from "./types.js";

/** Returns stored values, nested item refs and a token for conditional writes. Does not reserve the document. */
const getEditable = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsGetEditableInput<K>,
): ServiceResponse<DocumentEditable<K>> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: getEditable }, { default: resolveDocumentActor }] =
				await Promise.all([
					import("../../../../services/documents/get-editable.js"),
					import(
						"../../../../services/documents/helpers/resolve-document-actor.js"
					),
				]);

			const actor = await resolveDocumentActor(context, {
				...data,
				action: "read",
			});
			if (actor.error) return actor;

			const result = await getEditable(context, data);
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					...result.data,
					// Generated field types use the same collection shape validated by the reader.
					data: result.data.data as CollectionDocumentEditable<K>,
				},
			};
		},
		name: {
			key: "core.toolkit.documents.get-editable.error.name",
		},
		message: {
			key: "core.toolkit.documents.get-editable.error.message",
		},
	});

export default getEditable;
