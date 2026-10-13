import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";

export type ToolkitRequestsScheduleInput = z.input<typeof inputSchema>;

/** Schedules completion for once the request is approved, or removes the schedule. */
const schedule = (
	context: ServiceContext,
	input: ToolkitRequestsScheduleInput,
): ServiceResponse<undefined> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async ({ actor, at, timezone, ...data }) => {
			const [
				{ default: resolveActorUser },
				{ default: serviceWrapper },
				{ default: updateSingle },
			] = await Promise.all([
				import("../../../../services/users/helpers/resolve-actor-user.js"),
				import("../../../../utils/services/service-wrapper.js"),
				import("../../../../services/requests/update-single.js"),
			]);

			return serviceWrapper(
				async (context: ServiceContext): ServiceResponse<undefined> => {
					const userRes = await resolveActorUser(context, { actor });
					if (userRes.error) return userRes;

					return updateSingle(context, {
						...data,
						scheduledAt: at,
						scheduledTimezone: timezone ?? null,
						user: userRes.data,
						agentRunId: actor.agentRunId,
					});
				},
				{ transaction: true },
			)(context);
		},
		name: { key: "core.toolkit.requests.schedule.error.name" },
		message: { key: "core.toolkit.requests.schedule.error.message" },
	});

export default schedule;
