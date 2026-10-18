import escapeHtml from "./escape-html.js";

export type AttributeValue = string | number | boolean | null;

const NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

/** Writes HTML attributes with a leading space: `true` writes the name alone, and `false` or `null` leaves it out. */
const formatAttributes = (attributes: Record<string, AttributeValue>) =>
	Object.entries(attributes)
		.map(([name, value]) => {
			if (!NAME.test(name)) {
				throw new Error(`"${name}" isn't a valid attribute name.`);
			}
			if (value === false || value === null) return "";
			if (value === true) return ` ${name}`;
			return ` ${name}="${escapeHtml(String(value))}"`;
		})
		.join("");

export default formatAttributes;
