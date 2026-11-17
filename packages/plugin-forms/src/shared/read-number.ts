import type { FormFieldSettings } from "../types.js";

/** Reads a numeric setting such as `min` or `maxLength`, or undefined when it isn't a number. */
const readNumber = (
	settings: FormFieldSettings,
	key: string,
): number | undefined => {
	const value = settings[key];
	return typeof value === "number" && Number.isFinite(value)
		? value
		: undefined;
};

export default readNumber;
