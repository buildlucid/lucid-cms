import type { LocalizationConfig } from "../../../types/config.js";

/** Describes message-context metadata and configured content languages for agent instructions. */
export const environmentInstructions = (localization: LocalizationConfig) =>
	[
		"## Time and People",
		"Each message from the person or routine ends with <message_context>: when it was sent, in UTC and as local time in a timezone, and who the run acts for. Treat the latest message's time as now when working with dates, such as how old something is. Tool timestamps are UTC, so give people dates and times in the message's local time.",
		...(localization.locales.length
			? [
					"## Content Languages",
					`Content is written in: ${localization.locales
						.map(
							(locale) =>
								`${locale.label} (${locale.code}${locale.code === localization.defaultLocale ? ", default" : ""})`,
						)
						.join(", ")}.`,
				]
			: []),
	].join("\n");
