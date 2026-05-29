import { text } from "../../i18n/index.js";
import type { EmailAdapter } from "../types.js";

const passthroughEmailAdapter: EmailAdapter = async () => {
	return {
		type: "email-adapter",
		key: "passthrough",
		send: async () => {
			return {
				success: true,
				deliveryStatus: "sent",
				message: text.server("core.email.successfully.sent"),
				data: null,
				externalMessageId: null,
			};
		},
	};
};

export default passthroughEmailAdapter;
