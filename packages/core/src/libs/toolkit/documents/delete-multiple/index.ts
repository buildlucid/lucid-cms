import type z from "zod";
import type deleteMultipleWithResults from "../../../../services/documents/delete-multiple-with-results.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** Explicit documents to delete. Duplicate IDs are processed once. */
export type ToolkitDocumentsDeleteMultipleInput = z.input<typeof inputSchema>;
/** Per-document outcomes. A failed document does not undo successful deletions. */
export type ToolkitDocumentsDeleteMultipleResult = NonNullable<
	Awaited<ReturnType<typeof deleteMultipleWithResults>>["data"]
>;

/** Deletes explicit documents and reports each outcome. Use deleteSingle for a conditional deletion. */
const deleteMultiple = (
	context: ServiceContext,
	input: ToolkitDocumentsDeleteMultipleInput,
): ServiceResponse<ToolkitDocumentsDeleteMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [
				{ default: deleteMultipleWithResults },
				{ default: resolveDocumentActor },
			] = await Promise.all([
				import(
					"../../../../services/documents/delete-multiple-with-results.js"
				),
				import(
					"../../../../services/documents/helpers/resolve-document-actor.js"
				),
			]);

			const actor = await resolveDocumentActor(context, {
				...data,
				action: "delete",
			});
			if (actor.error) return actor;

			const { actor: _, ...values } = data;
			return deleteMultipleWithResults(context, {
				...values,
				userId: actor.data.userId,
			});
		},
		name: {
			key: "core.toolkit.documents.delete-multiple.error.name",
		},
		message: {
			key: "core.toolkit.documents.delete-multiple.error.message",
		},
	});

export default deleteMultiple;
