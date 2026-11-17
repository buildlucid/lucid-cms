const entities: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

/** Escapes text for HTML content and quoted attribute values. */
const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (character) => entities[character] ?? character);

export default escapeHtml;
