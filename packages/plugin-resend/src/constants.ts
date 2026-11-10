import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/resend";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const WEBHOOK_ENABLED = false;
export const PLUGIN_IDENTIFIER = "resend";
export const priorityHeaders = {
	low: {
		Importance: "low",
		Priority: "non-urgent",
		"X-Priority": "5",
	},
	normal: {},
	high: {
		Importance: "high",
		Priority: "urgent",
		"X-Priority": "1",
	},
} as const;
