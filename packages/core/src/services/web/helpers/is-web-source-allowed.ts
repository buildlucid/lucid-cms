import { webUrlSchema } from "../../../libs/lucid-remote/schema/web.js";

/** Tests a source URL against the allowed domains, including their subdomains. Without a list, any public website is allowed. */
const isWebSourceAllowed = (value: string, allowedDomains?: string[]) => {
	const parsed = webUrlSchema.safeParse(value);
	if (!parsed.success) return false;
	const hostname = new URL(parsed.data).hostname;
	return (
		!allowedDomains ||
		allowedDomains.some(
			(domain) => hostname === domain || hostname.endsWith(`.${domain}`),
		)
	);
};

export default isWebSourceAllowed;
