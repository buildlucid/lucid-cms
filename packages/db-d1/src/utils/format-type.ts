import type { ColumnDataType } from "kysely";

const formatType = (type: ColumnDataType | string): ColumnDataType => {
	return type.toLowerCase() as ColumnDataType;
};

export default formatType;
