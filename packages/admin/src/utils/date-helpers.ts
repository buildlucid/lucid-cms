const formatDate = (date?: string | null) => {
	if (!date) return undefined;

	const dateVal = new Date(date);
	return dateVal.toLocaleDateString("en-gb", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
};

const formatFullDate = (date?: string | null) => {
	if (!date) return undefined;

	const dateVal = new Date(date);
	return dateVal.toLocaleDateString("en-gb", {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
	});
};

const dateHelpers = {
	formatDate,
	formatFullDate,
};

export default dateHelpers;
