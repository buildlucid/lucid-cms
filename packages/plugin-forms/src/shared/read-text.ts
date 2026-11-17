/** Reads a value as text, or null when it isn't a string or is only whitespace. The text isn't trimmed. */
const readText = (value: unknown): string | null =>
	typeof value === "string" && value.trim() !== "" ? value : null;

export default readText;
