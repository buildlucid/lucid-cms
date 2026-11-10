type FilterParamValue = string | number | boolean | (string | number)[];

/**
 * Appends filter values, repeating list parameters with `in` by default. Comma-separated text
 * without an operator is treated as a list.
 */
const appendFilterParam = (
	params: URLSearchParams,
	props: {
		/** Builds the parameter name, such as `filter[title:contains]`, for an operator. */
		name: (operator: string | undefined) => string;
		value: FilterParamValue;
		operator?: string;
	},
) => {
	const typedList =
		props.operator === undefined &&
		typeof props.value === "string" &&
		props.value.includes(",");
	const values = typedList ? String(props.value).split(",") : props.value;

	if (!Array.isArray(values)) {
		params.set(props.name(props.operator), String(values));
		return;
	}

	const name = props.name(props.operator ?? "in");
	params.delete(name);
	for (const value of values) {
		params.append(name, String(value));
	}
};

export default appendFilterParam;
