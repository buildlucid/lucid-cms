import type { priorityHeaders } from "../constants.js";

export type PluginOptions = {
	/** Your Resend API key */
	apiKey: string;
	/** The webhook configuration to use for receiving delivery status updates */
	webhook?: {
		enabled: boolean;
		secret: string;
	};
};

export type EmailPriority = keyof typeof priorityHeaders;

export type EmailWithPriority = {
	priority?: EmailPriority;
	headers?: Record<string, string> | null;
};
