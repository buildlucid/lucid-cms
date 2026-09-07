import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { DocumentEditToken } from "../types.js";
import { inputSchema } from "./schema.js";

/** Document to move to the bin or permanently delete. */
export type ToolkitDocumentsDeleteSingleInput = Omit<
	z.input<typeof inputSchema>,
	"ifUnchanged"
> & {
	/** Reject the deletion if this token no longer matches the latest content. */
	ifUnchanged?: DocumentEditToken;
};

/** Moves a document to the bin. Set hard to permanently delete it, its content and history. */
const deleteSingle = (
	context: ServiceContext,
	input: ToolkitDocumentsDeleteSingleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: deleteSingle }, { default: resolveDocumentActor }] =
				await Promise.all([
					import("../../../../services/documents/delete-single.js"),
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
			return deleteSingle(context, { ...values, userId: actor.data.userId });
		},
		name: {
			key: "core.toolkit.documents.delete-single.error.name",
		},
		message: {
			key: "core.toolkit.documents.delete-single.error.message",
		},
	});

export default deleteSingle;
