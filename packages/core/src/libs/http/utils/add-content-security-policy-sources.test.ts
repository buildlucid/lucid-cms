import { expect, test } from "vitest";
import type { SecurityContentSecurityPolicy } from "../../../types/config.js";
import addContentSecurityPolicySources from "./add-content-security-policy-sources.js";

const createConfig = (
	contentSecurityPolicy?: SecurityContentSecurityPolicy,
) => ({
	http: { security: { headers: { contentSecurityPolicy } } },
});

test("adds sources without narrowing what the policy already allowed", () => {
	const config = createConfig({
		defaultSrc: ["'self'"],
		childSrc: ["'self'", "https://embed.example"],
		scriptSrc: ["'self'", "https://challenge.example"],
	});

	addContentSecurityPolicySources(config, {
		scriptSrc: ["https://challenge.example"],
		frameSrc: ["https://challenge.example"],
		connectSrc: ["https://challenge.example"],
	});

	expect(config.http.security.headers.contentSecurityPolicy).toEqual({
		defaultSrc: ["'self'"],
		childSrc: ["'self'", "https://embed.example"],
		scriptSrc: ["'self'", "https://challenge.example"],
		frameSrc: ["'self'", "https://embed.example", "https://challenge.example"],
		connectSrc: ["'self'", "https://challenge.example"],
	});
});

test("adds script sources to script-src-elem when the policy sets it", () => {
	const config = createConfig({
		defaultSrc: ["'self'"],
		scriptSrcElem: ["'self'"],
	});

	addContentSecurityPolicySources(config, {
		scriptSrc: ["https://challenge.example"],
	});

	expect(config.http.security.headers.contentSecurityPolicy).toEqual({
		defaultSrc: ["'self'"],
		scriptSrc: ["'self'", "https://challenge.example"],
		scriptSrcElem: ["'self'", "https://challenge.example"],
	});
});

test("leaves unrestricted directives and projects without a policy alone", () => {
	const unrestricted = createConfig({ imgSrc: ["'self'"] });
	const none = createConfig();

	addContentSecurityPolicySources(unrestricted, {
		scriptSrc: ["https://challenge.example"],
	});
	addContentSecurityPolicySources(none, {
		scriptSrc: ["https://challenge.example"],
	});

	expect(unrestricted.http.security.headers.contentSecurityPolicy).toEqual({
		imgSrc: ["'self'"],
	});
	expect(none.http.security.headers.contentSecurityPolicy).toBeUndefined();
});
