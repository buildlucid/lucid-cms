export const getDateGroupKey = (dateStr: string | null): string => {
	if (!dateStr) return "Unknown";

	const date = new Date(dateStr);
	const now = new Date();
	const getStartOfDay = (source: Date) =>
		new Date(
			source.getFullYear(),
			source.getMonth(),
			source.getDate(),
		).getTime();
	const MILLISECONDS_IN_DAY = 1000 * 60 * 60 * 24;
	const diffDays = Math.max(
		0,
		Math.round(
			(getStartOfDay(now) - getStartOfDay(date)) / MILLISECONDS_IN_DAY,
		),
	);

	if (diffDays === 0) {
		return "Today";
	}
	if (diffDays === 1) {
		return "Yesterday";
	}
	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}

	return date.toLocaleDateString("en-gb", {
		day: "numeric",
		month: "long",
	});
};
