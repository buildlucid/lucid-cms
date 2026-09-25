import { CronExpressionParser } from "cron-parser";
import { copy } from "../../../libs/i18n/index.js";

/** Parses schedule input at the API boundary and returns the next UTC occurrence. */
const nextRoutineOccurrence = (input: {
	cron: string;
	timezone: string;
	from?: Date;
}) => {
	if (input.cron.trim().split(/\s+/).length !== 5) {
		return {
			data: undefined,
			error: {
				type: "basic" as const,
				status: 400,
				message: copy("server:agent.schedule.invalid"),
			},
		};
	}

	try {
		return {
			error: undefined,
			data: CronExpressionParser.parse(input.cron, {
				tz: input.timezone,
				currentDate: input.from,
			})
				.next()
				.toDate()
				.toISOString(),
		};
	} catch {
		return {
			error: {
				type: "basic" as const,
				status: 400,
				message: copy("server:agent.routine.schedule.invalid"),
			},
			data: undefined,
		};
	}
};
export default nextRoutineOccurrence;
