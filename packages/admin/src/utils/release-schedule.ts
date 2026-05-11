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

export const getScheduledAt = (params: {
	date: string;
	time: string;
	timezone: string;
}) => {
	const [year, month, day] = params.date.split("-").map(Number);
	const [hour, minute] = params.time.split(":").map(Number);

	if (!year || !month || !day || hour === undefined || minute === undefined) {
		return null;
	}

	const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: params.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(new Date(utcGuess));
	const value = (type: string) =>
		Number(parts.find((part) => part.type === type)?.value);
	const zonedAsUtc = Date.UTC(
		value("year"),
		value("month") - 1,
		value("day"),
		value("hour"),
		value("minute"),
		value("second"),
		0,
	);
	const offset = zonedAsUtc - utcGuess;

	return new Date(utcGuess - offset).toISOString();
};
