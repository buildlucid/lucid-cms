import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { DocumentWriteResult } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsCreateSingleInput } from "./types.js";

export type * from "./types.js";

/** Creates a document with validated values and collection defaults. */
const createSingle = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsCreateSingleInput<K>,
): ServiceResponse<DocumentWriteResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: writeSingle }, { default: resolveDocumentActor }] =
				await Promise.all([
					import("../../../../services/documents/write-single.js"),
					import(
						"../../../../services/documents/helpers/resolve-document-actor.js"
					),
				]);

			const actor = await resolveDocumentActor(context, {
				...data,
				action: "create",
			});
			if (actor.error) return actor;

			const { actor: _, ...values } = data;
			return writeSingle(context, { ...values, ...actor.data, kind: "create" });
		},
		name: {
			key: "core.toolkit.documents.create-single.error.name",
		},
		message: {
			key: "core.toolkit.documents.create-single.error.message",
		},
	});

export default createSingle;
