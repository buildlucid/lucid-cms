export const PLUGIN_KEY = "plugin-resend";
export const LUCID_VERSION = "0.x.x";
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
