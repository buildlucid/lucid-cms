import { copy } from "../../../libs/i18n/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** Validates a requested release time. Null clears the schedule. */
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
				message: copy("server:core.releases.schedule.future"),
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
				message: copy("server:core.releases.schedule.timezone.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	date.setUTCSeconds(0, 0);
	return {
		error: undefined,
		data: { scheduledAt: date.toISOString(), timezone },
	};
};

export default parseSchedule;
