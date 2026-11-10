import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/seo";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const COMPONENTS_MODULE = "@lucidcms/seo/components";
export const fields = {
	title: "title",
	description: "description",
	socialTitle: "socialTitle",
	socialDescription: "socialDescription",
	socialImage: "socialImage",
	socialImageAlt: "socialImageAlt",
	ogType: "ogType",
	xCard: "xCard",
	xTitle: "xTitle",
	xDescription: "xDescription",
	xImage: "xImage",
	xImageAlt: "xImageAlt",
	canonicalUrl: "canonicalUrl",
	indexing: "indexing",
	following: "following",
	maxSnippet: "maxSnippet",
	maxImagePreview: "maxImagePreview",
	maxVideoPreview: "maxVideoPreview",
	structuredData: "structuredData",
	metadata: "metadata",
	attribute: "attribute",
	name: "name",
	content: "content",
} as const;
