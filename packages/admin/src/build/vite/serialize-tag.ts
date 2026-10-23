import type { HtmlTagDescriptor } from "vite";

const voidTags = new Set(["link", "meta", "base"]);

const escapeAttribute = (value: string) =>
	value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");

/** Serializes an HTML tag descriptor for documents rendered outside Vite's HTML pipeline. */
const serializeTag = (descriptor: HtmlTagDescriptor): string => {
	const attributes = Object.entries(descriptor.attrs ?? {})
		.filter(([, value]) => value !== false && value !== undefined)
		.map(([name, value]) =>
			value === true
				? ` ${name}`
				: ` ${name}="${escapeAttribute(String(value))}"`,
		)
		.join("");
	if (voidTags.has(descriptor.tag)) return `<${descriptor.tag}${attributes}>`;

	const children =
		typeof descriptor.children === "string"
			? descriptor.children
			: (descriptor.children ?? []).map(serializeTag).join("");
	return `<${descriptor.tag}${attributes}>${children}</${descriptor.tag}>`;
};

export default serializeTag;
