export const parseReferenceId = (value: string | null) => {
	if (value === null) return null;
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
};
