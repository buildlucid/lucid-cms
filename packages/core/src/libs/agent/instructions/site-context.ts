import type { AiContextEntry } from "../../../types/config.js";

/** Formats site context for agents and MCP, returning an empty string when nothing is configured. */
export const siteContextInstructions = (entries: readonly AiContextEntry[]) =>
	entries.length
		? [
				"## Site Context",
				"The site's developers and plugins describe the site below. Use it when writing content and when answering questions about the site.",
				...entries.map(
					(entry) =>
						`<site_context key="${entry.key}">\n${entry.content}\n</site_context>`,
				),
			].join("\n")
		: "";
