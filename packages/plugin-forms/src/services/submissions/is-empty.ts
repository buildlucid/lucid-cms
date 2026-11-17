/** Whether an answer was left out: nothing, blank text or an empty list. */
const isEmpty = (value: unknown): boolean =>
	value === undefined ||
	value === null ||
	(typeof value === "string" && value.trim() === "") ||
	(Array.isArray(value) && value.length === 0);

export default isEmpty;
