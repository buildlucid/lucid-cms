import type z from "zod";
import type { User } from "../../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

/** A user to read, optionally as another user. */
export type ToolkitUsersGetSingleInput = z.input<typeof inputSchema>;

/** Returns a user, including deleted ones, with the details the actor could see in the admin. */
const getSingle = (
	context: ServiceContext,
	input: ToolkitUsersGetSingleInput,
): ServiceResponse<User> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const [{ default: resolveActorUser }, { default: getSingle }] =
				await Promise.all([
					import("../../../../services/users/helpers/resolve-actor-user.js"),
					import("../../../../services/users/get-single.js"),
				]);

			const userRes = await resolveActorUser(context, { actor: data.actor });
			if (userRes.error) return userRes;

			return getSingle(context, { userId: data.id, authUser: userRes.data });
		},
		name: { key: "core.toolkit.users.get-single.error.name" },
		message: { key: "core.toolkit.users.get-single.error.message" },
	});

export default getSingle;
