import { z } from "@lucidcms/core";

/** The site origin a sitemap or robots.txt read is for, checked against the configured site URLs when read. */
export const originSchema = z.string().trim().min(1).optional().meta({
	description:
		"The site origin to read it for, when locales have their own domains. Defaults to the default locale's",
	example: "https://example.fr",
});
