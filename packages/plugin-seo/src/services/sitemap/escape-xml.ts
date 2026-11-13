const entities: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&apos;",
};

/** Escapes text for XML element content and attribute values. */
const escapeXml = (value: string) =>
	value.replace(/[&<>"']/g, (character) => entities[character] ?? character);

export default escapeXml;
