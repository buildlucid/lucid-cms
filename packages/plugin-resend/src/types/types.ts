export type PluginOptions = {
	from: {
		email: string;
		name: string;
	};
	/** Your Resend API key */
	apiKey: string;
	/** When set to true, the plugin will not send emails but will still return as a success */
	simulate?: boolean;
	/** The webhook configuration to use for receiving delivery status updates */
	webhook?: {
		enabled: boolean;
		secret: string;
	};
};
