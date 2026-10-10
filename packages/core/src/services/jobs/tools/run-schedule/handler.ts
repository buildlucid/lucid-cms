import type z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import triggerSchedule from "../../trigger-schedule.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Queues a schedule's job now, attributed to the person the run acts for. */
const runSchedule: ServiceFn<
	[z.output<typeof inputSchema> & { userId: number | null }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const triggered = await triggerSchedule(context, {
		scheduleKey: props.scheduleKey,
		userId: props.userId ?? undefined,
	});
	if (triggered.error) return triggered;

	return {
		error: undefined,
		data: {
			output: { job: triggered.data },
		},
	};
};

export default runSchedule;
