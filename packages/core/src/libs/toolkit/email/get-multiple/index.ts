import type z from "zod";
import type { ContentList, Email } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService, toPagination } from "../../utils.js";
import resolveReadActor from "../resolve-read-actor.js";
import { inputSchema, type querySchema } from "./schema.js";

export type ToolkitEmailGetMultipleQuery = z.input<typeof querySchema>;

export type ToolkitEmailGetMultipleInput = z.input<typeof inputSchema>;

export type ToolkitEmailGetMultipleResult = ContentList<Email>;

/** Lists emails the actor can read, without their data, attachments or HTML. */
const getMultiple = (
	context: ServiceContext,
	input: ToolkitEmailGetMultipleInput = {},
): ServiceResponse<ToolkitEmailGetMultipleResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getMultiple } =
				await import("../../../../services/email/get-multiple.js");

			const actorRes = await resolveReadActor(context, data);
			if (actorRes.error) return actorRes;

			const result = await getMultiple(context, {
				query: data.query,
				authUser: actorRes.data,
			});
			if (result.error) return result;

			return {
				error: undefined,
				data: {
					items: result.data.data,
					pagination: toPagination(result.data.count, data.query),
				},
			};
		},
		name: { key: "core.toolkit.email.get-multiple.error.name" },
		message: { key: "core.toolkit.email.get-multiple.error.message" },
	});

export default getMultiple;
