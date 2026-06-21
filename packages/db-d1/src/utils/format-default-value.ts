import type { ColumnDataType } from "kysely";

const formatDefaultValue = (
	type: ColumnDataType,
	defaultValue: string | null,
) => {
	if (defaultValue === null) return null;

	if (defaultValue === "''") return "";

	if (
		type === "json" &&
		defaultValue.startsWith("'") &&
		defaultValue.endsWith("'")
	) {
		try {
			return JSON.parse(defaultValue.slice(1, -1));
		} catch {
			return null;
		}
	}

	if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
		return defaultValue.slice(1, -1);
	}

	if (/^-?\d+(\.\d+)?$/.test(defaultValue)) {
		return type === "integer" || type === "bigint"
			? Number.parseInt(defaultValue, 10)
			: Number.parseFloat(defaultValue);
	}

	return defaultValue;
};

export default formatDefaultValue;
