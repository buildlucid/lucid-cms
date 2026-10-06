import type { ColumnDataType } from "kysely";

const formatType = (
	type: ColumnDataType | string,
	defaultValue: string | null,
): ColumnDataType => {
	//* timestamps are created as timestamptz, so a plain timestamp column reads as a type change
	if (type === "timestamp with time zone") return "timestamptz";
	if (type.includes("timestamp")) return "timestamp";
	if (type.includes("character")) return "text";

	if (type === "integer" && defaultValue?.includes("nextval(")) {
		return "serial";
	}

	return type as ColumnDataType;
};

export default formatType;
