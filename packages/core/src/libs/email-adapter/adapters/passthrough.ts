import type { EmailAdapter } from "../types.js";

const passthroughEmailAdapter: EmailAdapter = async () => {
	return {
		type: "email-adapter",
		key: "passthrough",
		services: {
			send: async () => {
				return {
					success: true,
					deliveryStatus: "sent",
					message: "Email sending simulated (passthrough adapter)",
					data: null,
					externalMessageId: null,
				};
			},
		},
	};
};

export default passthroughEmailAdapter;
