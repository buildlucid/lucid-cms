import type { ColumnDataType } from "kysely";

const formatDefaultValue = (
	type: ColumnDataType,
	defaultValue: string | null,
) => {
	if (defaultValue === null) return null;

	if (defaultValue === "''") return "";

	if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
		const unquoted = defaultValue.slice(1, -1);

		if (unquoted.toUpperCase() === "CURRENT_TIMESTAMP") {
			return null;
		}

		return unquoted;
	}

	if (/^-?\d+(\.\d+)?$/.test(defaultValue)) {
		return type === "integer" || type === "bigint"
			? Number.parseInt(defaultValue, 10)
			: Number.parseFloat(defaultValue);
	}

	return null;
};

export default formatDefaultValue;
