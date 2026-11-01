import type z from "zod";
import type { Email } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import resolveReadActor from "../resolve-read-actor.js";
import { inputSchema } from "./schema.js";

export type ToolkitEmailGetSingleInput = z.input<typeof inputSchema>;

/** Returns an email the actor can read, without its HTML. */
const getSingle = (
	context: ServiceContext,
	input: ToolkitEmailGetSingleInput,
): ServiceResponse<Email> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: getSingle } =
				await import("../../../../services/email/get-single.js");

			const actorRes = await resolveReadActor(context, data);
			if (actorRes.error) return actorRes;

			return getSingle(context, {
				id: data.id,
				renderTemplate: false,
				authUser: actorRes.data,
			});
		},
		name: { key: "core.toolkit.email.get-single.error.name" },
		message: { key: "core.toolkit.email.get-single.error.message" },
	});

export default getSingle;
