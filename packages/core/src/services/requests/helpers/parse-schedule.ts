import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/**
 * Validates the completion time, rounding it up to the minute so a request never completes before
 * the time asked for. Null clears the schedule.
 */
const parseSchedule = (data: {
	scheduledAt: string | null;
	scheduledTimezone?: string | null;
}): Awaited<
	ServiceResponse<{ scheduledAt: string | null; timezone: string | null }>
> => {
	if (data.scheduledAt === null) {
		return {
			error: undefined,
			data: { scheduledAt: null, timezone: null },
		};
	}

	const date = new Date(data.scheduledAt);
	if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.schedule.future"),
				status: 400,
			},
			data: undefined,
		};
	}

	const timezone = data.scheduledTimezone ?? "UTC";
	try {
		new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
	} catch {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.schedule.timezone.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
		date.setUTCSeconds(60, 0);
	}
	return {
		error: undefined,
		data: { scheduledAt: date.toISOString(), timezone },
	};
};

export default parseSchedule;
