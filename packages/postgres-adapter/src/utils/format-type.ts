import type { ColumnDataType } from "kysely";

const formatType = (
	type: ColumnDataType | string,
	defaultValue: string | null,
): ColumnDataType => {
	//* handles types like timestamp without time zone
	if (type.includes("timestamp")) return "timestamp";
	if (type.includes("character")) return "text";

	if (type === "integer" && defaultValue?.includes("nextval(")) {
		return "serial";
	}

	return type as ColumnDataType;
};

export default formatType;
