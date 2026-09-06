import type { ResolvedLucidConfig } from "../../types/config.js";

/**
 * Keeps each configured sender value and fills missing values from the host
 * and the default sender name.
 */
const getEmailFrom = (
	config: ResolvedLucidConfig,
	url: string | undefined,
): {
	email: string;
	name: string;
} => {
	let fallbackAddress = "noreply@example.com";
	if (url) {
		try {
			const parsedUrl = new URL(url);
			fallbackAddress = `noreply@${parsedUrl.hostname}`;
		} catch {}
	}

	return {
		email: config.email.from?.email ?? fallbackAddress,
		name: config.email.from?.name ?? "Lucid CMS",
	};
};

export default getEmailFrom;
