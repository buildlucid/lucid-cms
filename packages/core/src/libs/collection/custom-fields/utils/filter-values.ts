import type { FilterValue } from "../../../../types/query-params.js";
import type { CollectionSchemaColumn } from "../../schema/types.js";
import type { CustomFieldFilterFormatter } from "../types.js";

type ScalarFilterValue = string | number | boolean | null;

/** Applies scalar filter formatting to either single or array filter values. */
const mapFilterValue = (
	value: FilterValue,
	format: (value: ScalarFilterValue) => ScalarFilterValue,
): FilterValue => {
	if (Array.isArray(value)) {
		return value.map((item) => format(item)) as FilterValue;
	}

	return format(value) as FilterValue;
};

/** Checks the actual generated column type before applying numeric coercion. */
const isIntegerColumn = (columnType: CollectionSchemaColumn["type"]) => {
	return (
		typeof columnType === "string" && columnType.toLowerCase() === "integer"
	);
};

/** Converts integer query values, using null for invalid input so filters return no rows. */
const formatIntegerValue = (value: ScalarFilterValue) => {
	if (typeof value === "number") {
		return Number.isInteger(value) ? value : null;
	}

	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (trimmed.length === 0) return null;

	const numericValue = Number(trimmed);
	return Number.isInteger(numericValue) ? numericValue : null;
};

/** Converts finite numeric query values, using null for invalid input. */
const formatNumberValue = (value: ScalarFilterValue) => {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}

	if (typeof value !== "string") return null;

	const trimmed = value.trim();
	if (trimmed.length === 0) return null;

	const numericValue = Number(trimmed);
	return Number.isFinite(numericValue) ? numericValue : null;
};

/** Converts boolean query values to the database's boolean storage representation. */
const formatBooleanValue = (
	value: ScalarFilterValue,
	columnType: CollectionSchemaColumn["type"],
) => {
	let boolValue: boolean | undefined;

	if (typeof value === "boolean") {
		boolValue = value;
	} else if (typeof value === "number" && (value === 1 || value === 0)) {
		boolValue = value === 1;
	} else if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "1" || normalized === "true") boolValue = true;
		if (normalized === "0" || normalized === "false") boolValue = false;
	}

	if (boolValue === undefined) return null;
	return columnType === "boolean" ? boolValue : boolValue ? 1 : 0;
};

/** Formats checkbox filters for boolean or integer-backed database columns. */
export const formatBooleanFilterValue: CustomFieldFilterFormatter = ({
	value,
	column,
}) => {
	return mapFilterValue(value, (item) => formatBooleanValue(item, column.type));
};

/** Formats filters for fields stored as integer IDs or numeric columns. */
export const formatIntegerFilterValue: CustomFieldFilterFormatter = ({
	value,
	column,
}) => {
	if (!isIntegerColumn(column.type)) return value;

	return mapFilterValue(value, formatIntegerValue);
};

/** Formats decimal-capable numeric field filters. */
export const formatNumberFilterValue: CustomFieldFilterFormatter = ({
	value,
}) => {
	return mapFilterValue(value, formatNumberValue);
};
