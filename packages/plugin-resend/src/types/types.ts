export type PluginOptions = {
	/** Your Resend API key */
	apiKey: string;
	/** The webhook configuration to use for receiving delivery status updates */
	webhook?: {
		/** Register the delivery-status webhook route. */
		enabled: boolean;
		/** Resend webhook signing secret used to verify incoming events. */
		secret: string;
	};
};
