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
