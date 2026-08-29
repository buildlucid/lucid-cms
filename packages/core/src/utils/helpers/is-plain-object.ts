type PlainObject = Record<PropertyKey, unknown>;

/** Returns true for object literals and objects without a prototype. */
const isPlainObject = (value: unknown): value is PlainObject => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

export default isPlainObject;
