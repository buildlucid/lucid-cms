export const getDefaultTimezone = () =>
	Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const getSupportedTimezones = () => {
	const intl = Intl as typeof Intl & {
		supportedValuesOf?: (_key: "timeZone") => string[];
	};

	try {
		return (
			intl.supportedValuesOf?.("timeZone") ?? [getDefaultTimezone(), "UTC"]
		);
	} catch {
		return [getDefaultTimezone(), "UTC"];
	}
};

/** Converts a valid wall-clock time in an IANA zone to UTC, rejecting skipped DST times. */
export const getScheduledAt = (params: {
	date: string;
	time: string;
	timezone: string;
}) => {
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(params.date) ||
		!/^\d{2}:\d{2}$/.test(params.time)
	) {
		return null;
	}

	const [year, month, day] = params.date.split("-").map(Number);
	const [hour, minute] = params.time.split(":").map(Number);
	if (
		!year ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31 ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null;
	}

	const desired = Date.UTC(year, month - 1, day, hour, minute);
	const date = new Date(desired);
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: params.timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hourCycle: "h23",
		});

		const wallClock = (timestamp: number) => {
			const parts = formatter.formatToParts(new Date(timestamp));
			const part = (type: Intl.DateTimeFormatPartTypes) =>
				Number(parts.find((value) => value.type === type)?.value);
			return Date.UTC(
				part("year"),
				part("month") - 1,
				part("day"),
				part("hour"),
				part("minute"),
			);
		};

		let timestamp = desired;
		for (let attempt = 0; attempt < 3; attempt++) {
			timestamp += desired - wallClock(timestamp);
		}

		return wallClock(timestamp) === desired
			? new Date(timestamp).toISOString()
			: null;
	} catch {
		return null;
	}
};

/** Formats an existing UTC schedule in its saved IANA timezone for editing. */
export const getScheduleFields = (
	scheduledAt: string | null,
	timezone: string,
) => {
	if (!scheduledAt) return { date: "", time: "", timezone };
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(scheduledAt));
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((value) => value.type === type)?.value ?? "";

	return {
		date: `${part("year")}-${part("month")}-${part("day")}`,
		time: `${part("hour")}:${part("minute")}`,
		timezone,
	};
};
