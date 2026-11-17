/** Whether a value is a plain object whose properties can be read, rather than a list or null. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export default isRecord;
