import type { ColumnDataType } from "kysely";

const formatDefaultValue = (
	type: ColumnDataType,
	defaultValue: string | null,
) => {
	if (defaultValue === null) return null;

	const withoutTypeCast = defaultValue.split("::")[0];
	if (withoutTypeCast === undefined) return null;

	if (withoutTypeCast.startsWith("'") && withoutTypeCast.endsWith("'")) {
		return withoutTypeCast.slice(1, -1);
	}

	if (withoutTypeCast.includes("nextval(")) {
		return null;
	}

	if (withoutTypeCast.includes("(")) {
		return null;
	}

	if (withoutTypeCast.toLowerCase() === "true") return true;
	if (withoutTypeCast.toLowerCase() === "false") return false;

	if (/^-?\d+(\.\d+)?$/.test(withoutTypeCast)) {
		return type === "integer" || type === "bigint"
			? Number.parseInt(withoutTypeCast, 10)
			: Number.parseFloat(withoutTypeCast);
	}

	return null;
};

export default formatDefaultValue;
