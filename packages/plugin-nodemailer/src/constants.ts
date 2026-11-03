import packageJson from "../package.json" with { type: "json" };

export const PLUGIN_KEY = "@lucidcms/plugin-nodemailer";
export const LUCID_VERSION = "0.x.x";

export const PACKAGE_INFO = {
	name: packageJson.name,
	version: packageJson.version,
};
export const PLUGIN_IDENTIFIER = "nodemailer";
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
