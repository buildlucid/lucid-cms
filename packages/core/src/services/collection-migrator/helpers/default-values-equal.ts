/**
 * Determines if the default values are equal for the collection/brick columns and the DB Adapter columns
 */
const defaultValuesEqual = (
	newDefault: unknown,
	existingDefault: unknown,
): boolean => {
	//* direct equality
	if (newDefault === existingDefault) return true;

	//* null/undefined cases
	if (newDefault == null || existingDefault == null) {
		return newDefault === existingDefault;
	}

	//* handle NaN
	if (typeof newDefault === "number" && typeof existingDefault === "number") {
		if (Number.isNaN(newDefault) && Number.isNaN(existingDefault)) return true;
	}

	//* handle arrays
	if (Array.isArray(newDefault) && Array.isArray(existingDefault)) {
		if (newDefault.length !== existingDefault.length) return false;
		return newDefault.every((val, index) =>
			defaultValuesEqual(val, existingDefault[index]),
		);
	}

	//* handle objects
	if (
		typeof newDefault === "object" &&
		typeof existingDefault === "object" &&
		!Array.isArray(newDefault) &&
		!Array.isArray(existingDefault)
	) {
		const newKeys = Object.keys(newDefault as object).sort();
		const existingKeys = Object.keys(existingDefault as object).sort();

		if (newKeys.length !== existingKeys.length) return false;
		if (!newKeys.every((key, i) => key === existingKeys[i])) return false;

		return newKeys.every((key) =>
			defaultValuesEqual(
				(newDefault as Record<string, unknown>)[key],
				(existingDefault as Record<string, unknown>)[key],
			),
		);
	}

	//* fallback - noot directly comparalbe or differnt types
	return false;
};

export default defaultValuesEqual;
