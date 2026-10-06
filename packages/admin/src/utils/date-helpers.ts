const parseDate = (date: string, localDateOnly?: boolean) => {
	if (localDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
		const [year, month, day] = date.split("-").map(Number);
		return new Date(year || 0, (month || 1) - 1, day || 1);
	}

	return new Date(date);
};

const browserLocale = () => {
	const locale = globalThis.navigator?.language;
	if (!locale) return "en-US";

	const [supported] = Intl.DateTimeFormat.supportedLocalesOf([locale]);
	return supported || "en-US";
};

const formatDate = (
	date?: string | null,
	options?: {
		includeTime?: boolean;
		localDateOnly?: boolean;
	},
) => {
	if (!date) return undefined;

	const dateVal = parseDate(date, options?.localDateOnly);
	if (Number.isNaN(dateVal.getTime())) return date;
	const locale = browserLocale();

	if (options?.includeTime) {
		return dateVal.toLocaleString(locale, {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "numeric",
			minute: "numeric",
		});
	}

	return dateVal.toLocaleDateString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

const formatFullDate = (
	date?: string | null,
	options?: {
		includeTime?: boolean;
		localDateOnly?: boolean;
	},
) => {
	if (!date) return undefined;

	const dateVal = parseDate(date, options?.localDateOnly);
	if (Number.isNaN(dateVal.getTime())) return date;
	const locale = browserLocale();

	if (options?.includeTime === false) {
		return dateVal.toLocaleDateString(locale, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}

	return dateVal.toLocaleString(locale, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	});
};

/** A compact timestamp: the time for today, otherwise the day, month and time. */
const formatTimestamp = (date?: string | null) => {
	if (!date) return undefined;
	const value = new Date(date);
	if (Number.isNaN(value.getTime())) return date;

	const today = value.toDateString() === new Date().toDateString();
	return value.toLocaleString(
		browserLocale(),
		today
			? { hour: "numeric", minute: "2-digit" }
			: { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
	);
};

const DAY = 24 * 60 * 60;
const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
	["year", 365 * DAY],
	["month", 30 * DAY],
	["week", 7 * DAY],
];

/**
 * How long ago a date was, such as "6 minutes ago", "yesterday" or "3 weeks
 * ago". Days count calendar days, so last night is "yesterday".
 */
const formatRelativeDate = (date?: string | null, now = Date.now()) => {
	if (!date) return undefined;
	const value = new Date(date);
	if (Number.isNaN(value.getTime())) return date;

	const formatter = new Intl.RelativeTimeFormat(browserLocale(), {
		numeric: "auto",
	});
	const seconds = Math.round((value.getTime() - now) / 1000);
	for (const [unit, size] of relativeUnits) {
		if (Math.abs(seconds) >= size) {
			return formatter.format(Math.trunc(seconds / size), unit);
		}
	}

	const days = Math.round(
		(new Date(value).setHours(0, 0, 0, 0) -
			new Date(now).setHours(0, 0, 0, 0)) /
			(DAY * 1000),
	);
	if (days !== 0) return formatter.format(days, "day");
	if (Math.abs(seconds) >= 60 * 60) {
		return formatter.format(Math.trunc(seconds / (60 * 60)), "hour");
	}
	if (Math.abs(seconds) >= 60) {
		return formatter.format(Math.trunc(seconds / 60), "minute");
	}
	return formatter.format(0, "second");
};

const toDateInputValue = (utcDate?: string | null) => {
	if (!utcDate) return "";

	const date = new Date(utcDate);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
};

const dateHelpers = {
	formatDate,
	formatFullDate,
	formatTimestamp,
	formatRelativeDate,
	toDateInputValue,
};

export default dateHelpers;
