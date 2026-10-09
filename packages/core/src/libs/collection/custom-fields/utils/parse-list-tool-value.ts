/** Accepts a single value for fields that store lists, eg. one media ID, as models often send one. */
const parseListToolValue = (value: unknown) =>
	value === null || value === undefined || Array.isArray(value)
		? value
		: [value];

export default parseListToolValue;
