import type { FormValue } from "../types.js";

/** Writes a stored answer as plain text, as the export and the admin show it: nothing for none, and lists separated by commas. */
const stringifyValue = (value: FormValue | undefined): string => {
	if (value === undefined || value === null) return "";
	return Array.isArray(value) ? value.join(", ") : String(value);
};

export default stringifyValue;
