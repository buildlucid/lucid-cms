import type z from "zod";
import type { TranslateDocumentsResponse } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitDocumentsTranslateInput = z.input<typeof inputSchema>;
type TranslateResponse = Exclude<
	TranslateDocumentsResponse,
	{ delivery: "editor" }
>;

/**
 * Translates documents with Lucid AI into a request per locale, into an
 * existing request with `requestId`, or straight to latest with `direct`,
 * leaving people's translations alone unless `overwrite` is set.
 */
const translate = (
	context: ServiceContext,
	input: ToolkitDocumentsTranslateInput,
): ServiceResponse<TranslateResponse> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({
			actor,
			locales,
			direct,
			...data
		}): ServiceResponse<TranslateResponse> => {
			const [{ default: translateDocuments }, { default: resolveActorUser }] =
				await Promise.all([
					import("../../../../services/translations/translate-documents.js"),
					import("../../../../services/users/helpers/resolve-actor-user.js"),
				]);

			const userRes = await resolveActorUser(context, { actor });
			if (userRes.error) return userRes;

			const input = {
				...data,
				targetLocales: locales,
				user: userRes.data,
				agentRunId: actor.agentRunId,
			};
			return direct
				? translateDocuments(context, { ...input, delivery: "latest" })
				: translateDocuments(context, { ...input, delivery: "request" });
		},
		name: { key: "core.toolkit.documents.translate.error.name" },
		message: { key: "core.toolkit.documents.translate.error.message" },
	});

export default translate;
