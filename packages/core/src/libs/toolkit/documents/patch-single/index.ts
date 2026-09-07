import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import type { DocumentWriteResult } from "../types.js";
import { inputSchema } from "./schema.js";
import type { ToolkitDocumentsPatchSingleInput } from "./types.js";

export type * from "./types.js";

/** Applies ordered operations to fields and nested items, then validates and saves the resulting document. */
const patchSingle = <K extends string>(
	context: ServiceContext,
	input: ToolkitDocumentsPatchSingleInput<K>,
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
			return writeSingle(context, { ...values, ...actor.data, kind: "patch" });
		},
		name: {
			key: "core.toolkit.documents.patch-single.error.name",
		},
		message: {
			key: "core.toolkit.documents.patch-single.error.message",
		},
	});

export default patchSingle;
