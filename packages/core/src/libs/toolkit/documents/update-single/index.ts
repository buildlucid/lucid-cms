import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { DocumentWriteResult } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsUpdateSingleInput } from "./types.js";

export type * from "./types.js";

/** Updates supplied fields and locales while preserving omitted values. Arrays replace their contents. */
const updateSingle = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsUpdateSingleInput<K>,
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
				action: "update",
			});
			if (actor.error) return actor;

			const { actor: _, ...values } = data;
			return writeSingle(context, { ...values, ...actor.data, kind: "update" });
		},
		name: {
			key: "core.toolkit.documents.update-single.error.name",
		},
		message: {
			key: "core.toolkit.documents.update-single.error.message",
		},
	});

export default updateSingle;
