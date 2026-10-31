import type { SecurityContentSecurityPolicy } from "../../../types/config.js";

/** Directives plugins can add sources to, with the directives browsers fall back to, in order. */
const fallbacks = {
	scriptSrc: ["defaultSrc"],
	frameSrc: ["childSrc", "defaultSrc"],
	connectSrc: ["defaultSrc"],
} as const satisfies Partial<
	Record<
		keyof SecurityContentSecurityPolicy,
		readonly (keyof SecurityContentSecurityPolicy)[]
	>
>;

/** Adds the origins a plugin's browser code needs to an existing Content Security Policy. Missing directives start from their fallback. */
const addContentSecurityPolicySources = (
	config: {
		http: {
			security: {
				headers?: { contentSecurityPolicy?: SecurityContentSecurityPolicy };
			};
		};
	},
	sources: Partial<Record<keyof typeof fallbacks, string[]>>,
) => {
	const policy = config.http.security.headers?.contentSecurityPolicy;
	if (!policy) return;

	for (const directive of ["scriptSrc", "frameSrc", "connectSrc"] as const) {
		const added = sources[directive];
		if (!added) continue;

		const current =
			policy[directive] ??
			fallbacks[directive].map((fallback) => policy[fallback]).find(Boolean);
		if (!current) continue;

		policy[directive] = [...new Set([...current, ...added])];
	}

	//* script-src-elem overrides script-src for script tags
	if (sources.scriptSrc && policy.scriptSrcElem) {
		policy.scriptSrcElem = [
			...new Set([...policy.scriptSrcElem, ...sources.scriptSrc]),
		];
	}
};

export default addContentSecurityPolicySources;
