import type { Config } from "../../types/config.js";

/**
 * Returns the email "from" values based on the following priority:
 * 1. If config.email.from is set, use it
 * 2. If a request URL is provided, use noreply@{host} and "Lucid CMS" for the name
 * 3. Fallback to noreply@example.com and "Lucid CMS" for the name
 */
const getEmailFrom = (
	config: Config,
	url: string | undefined,
): {
	email: string;
	name: string;
} => {
	if (config.email.from?.email && config.email.from?.name) {
		return {
			email: config.email.from.email,
			name: config.email.from.name,
		};
	}

	if (url) {
		try {
			const parsedUrl = new URL(url);
			return {
				email: `noreply@${parsedUrl.hostname}`,
				name: "Lucid CMS",
			};
		} catch {}
	}

	return {
		email: "noreply@example.com",
		name: "Lucid CMS",
	};
};

export default getEmailFrom;
