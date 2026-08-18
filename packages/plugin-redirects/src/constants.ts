export const PLUGIN_KEY = "plugin-redirects";
export const LUCID_VERSION = "0.x.x";
export const COLLECTION_KEY = "redirects";

export const fields = {
	from: "from",
	targetType: "targetType",
	targetDocument: "targetDocument",
	targetUrl: "targetUrl",
	statusCode: "statusCode",
	locale: "locale",
} as const;

export const targetTypes = {
	document: "document",
	url: "url",
} as const;

export const statusCodes = ["301", "302", "307", "308"] as const;
