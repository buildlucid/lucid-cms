import { webScopeSchema } from "../../../libs/lucid-remote/schema/web.js";

export type WebToolOptions = {
	/** Limits results and webpage reads to these domains and their subdomains, such as `example.com`. Omit to allow all public websites. This filters sources, but does not control website redirects. */
	allowedDomains?: string[];
};

/** Checks web tool options when the config loads, so a bad domain fails early with a clear message. */
export const resolveWebToolOptions = (options: WebToolOptions) => {
	const parsed = webScopeSchema.strict().safeParse(options);
	if (!parsed.success) {
		throw new Error(
			"Web tools need allowedDomains to be public hostnames such as example.com, without URLs, ports or wildcards.",
		);
	}

	return parsed.data;
};
