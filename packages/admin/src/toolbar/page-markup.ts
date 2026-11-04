import {
	createToolbarAttributes,
	type ToolbarAttributeOptions,
} from "./attributes.js";
import { escapeAttribute } from "./escape-attribute.js";

export type PageMarkupOptions = ToolbarAttributeOptions & {
	/** URL of the site's script that defines `<lucid-toolbar>`. */
	scriptSrc: string;
};

export type PageMarkup = {
	head: string;
	footer: string;
};

/** Creates toolbar and preview markup for the head and footer, empty when unused. */
export const createPageMarkup = ({
	scriptSrc,
	...options
}: PageMarkupOptions): PageMarkup => {
	const attributes = createToolbarAttributes(options);
	const previewing =
		options.preview !== undefined &&
		options.preview !== "auto" &&
		options.preview.kind === "preview";

	return {
		head: previewing ? '<meta name="referrer" content="no-referrer">' : "",
		footer: attributes
			? `<lucid-toolbar${Object.entries(attributes)
					.map(
						([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`,
					)
					.join(
						"",
					)}></lucid-toolbar><script type="module" src="${escapeAttribute(scriptSrc)}"></script>`
			: "",
	};
};
