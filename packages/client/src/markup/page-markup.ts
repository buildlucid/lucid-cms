import {
	type ToolbarToolkitResponses,
	toolbarFromToolkit,
} from "../toolbar/toolkit.js";
import { escapeAttribute } from "./escape-attribute.js";

export type PageMarkupOptions = ToolbarToolkitResponses & {
	/** URL serving `@lucidcms/client/bootstrap`. */
	scriptSrc: string;
};

export type PageMarkup = {
	head: string;
	footer: string;
};

/** Creates toolbar and preview markup for the head and footer, empty when unused. */
export const createPageMarkup = (options: PageMarkupOptions): PageMarkup => {
	const attributes = toolbarFromToolkit(options);
	const previewing = options.preview.data?.kind === "preview";

	return {
		head: previewing ? '<meta name="referrer" content="no-referrer">' : "",
		footer: attributes
			? `<lucid-toolbar${Object.entries(attributes)
					.map(
						([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`,
					)
					.join(
						"",
					)}></lucid-toolbar><script type="module" src="${escapeAttribute(options.scriptSrc)}"></script>`
			: "",
	};
};
