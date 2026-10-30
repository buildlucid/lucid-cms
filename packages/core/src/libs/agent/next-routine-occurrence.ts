import { Cron } from "croner";
import { copy } from "../i18n/index.js";

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

	let next: Date | null;
	try {
		next = new Cron(input.cron, { timezone: input.timezone }).nextRun(
			input.from,
		);
	} catch {
		next = null;
	}
	//* a schedule that never matches, such as 31 February, has no next run
	if (!next) {
		return {
			error: {
				type: "basic" as const,
				status: 400,
				message: copy("server:agent.routine.schedule.invalid"),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: next.toISOString() };
};
export default nextRoutineOccurrence;
