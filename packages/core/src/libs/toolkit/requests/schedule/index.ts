import type z from "zod";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import runRequestService from "../run-request-service.js";
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
			const { default: updateSingle } = await import(
				"../../../../services/requests/update-single.js"
			);

			return runRequestService(context, {
				actor,
				transaction: true,
				run: (context, user) =>
					updateSingle(context, {
						...data,
						scheduledAt: at,
						scheduledTimezone: timezone ?? null,
						user,
						agentRunId: actor.agentRunId,
					}),
			});
		},
		name: { key: "core.toolkit.requests.schedule.error.name" },
		message: { key: "core.toolkit.requests.schedule.error.message" },
	});

export default schedule;
