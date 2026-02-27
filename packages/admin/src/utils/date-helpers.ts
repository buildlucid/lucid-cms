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
	toDateInputValue,
};

export default dateHelpers;
