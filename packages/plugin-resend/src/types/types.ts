export type PluginOptions = {
	/** Your Resend API key */
	apiKey: string;
	/** The webhook configuration to use for receiving delivery status updates */
	webhook?: {
		enabled: boolean;
		secret: string;
	};
};
