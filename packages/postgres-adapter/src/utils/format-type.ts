import type { ColumnDataType } from "kysely";

const formatType = (type: ColumnDataType | string): ColumnDataType => {
	//* handles types like timestamp without time zone
	if (type.includes("timestamp")) return "timestamp";
	if (type.includes("character")) return "text";
	return type as ColumnDataType;
};

export default formatType;
