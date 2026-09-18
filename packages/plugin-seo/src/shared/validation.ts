import { z } from "@lucidcms/core";

/** Canonical overrides must be complete web URLs; validation never rewrites input. */
export const canonicalUrlSchema = z.string().refine((value) => {
	if (value !== value.trim() || /\s/.test(value)) return false;

	try {
		const url = new URL(value);
		return (
			["http:", "https:"].includes(url.protocol) &&
			!url.hash &&
			!value.includes("#") &&
			!url.username &&
			!url.password
		);
	} catch {
		return false;
	}
}, "Enter a full http:// or https:// URL without spaces, credentials or a fragment.");

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const hasType = (value: unknown) =>
	typeof value === "string"
		? value.trim().length > 0
		: Array.isArray(value) &&
			value.length > 0 &&
			value.every((item) => typeof item === "string" && item.trim().length > 0);

/** Checks the supported JSON-LD envelope, not Schema.org properties or rich-result eligibility. */
const isStructuredData = (value: unknown): boolean => {
	const isDocument = (item: unknown): boolean => {
		if (
			!isObject(item) ||
			typeof item["@context"] !== "string" ||
			![
				"https://schema.org",
				"https://schema.org/",
				"http://schema.org",
				"http://schema.org/",
			].includes(item["@context"])
		) {
			return false;
		}

		if ("@graph" in item) {
			return (
				Array.isArray(item["@graph"]) &&
				item["@graph"].length > 0 &&
				item["@graph"].every((node) => isObject(node) && hasType(node["@type"]))
			);
		}

		return hasType(item["@type"]);
	};

	return Array.isArray(value)
		? value.length > 0 && value.every(isDocument)
		: isDocument(value);
};

export const structuredDataSchema = z
	.union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
	.refine(
		isStructuredData,
		"Use a Schema.org @context and @type, an array of these objects, or an @graph containing typed objects.",
	);

const reservedMetadata = new Set([
	"title",
	"description",
	"robots",
	"googlebot",
	"googlebot-news",
	"bingbot",
	"canonical",
	"charset",
	"keywords",
]);

export const metadataNameSchema = z
	.string()
	.regex(
		/^[a-zA-Z][a-zA-Z0-9_.:-]*$/,
		"Use a metadata name such as author or article:author.",
	)
	.refine((value) => {
		const key = value.toLowerCase();
		return (
			!reservedMetadata.has(key) &&
			!key.startsWith("og:") &&
			!key.startsWith("twitter:")
		);
	}, "Use the dedicated SEO fields for titles, descriptions, robots, Open Graph and X cards. Meta keywords are not supported.");

export const previewLimitSchema = z.number().int().min(-1);

export const nonBlankTextSchema = z
	.string()
	.refine(
		(value) => value.trim().length > 0,
		"Enter text or leave this field empty.",
	);
