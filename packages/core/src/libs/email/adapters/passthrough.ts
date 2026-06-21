import { copy } from "../../i18n/index.js";
import type { EmailAdapter, EmailAdapterInstance } from "../types.js";

export const passthroughEmailAdapterInstance: EmailAdapterInstance = {
	type: "email-adapter",
	key: "passthrough",
	send: async () => {
		return {
			success: true,
			deliveryStatus: "sent",
			message: copy("server:core.email.successfully.sent"),
			data: null,
			externalMessageId: null,
		};
	},
};

const passthroughEmailAdapter: EmailAdapter = () =>
	passthroughEmailAdapterInstance;

export default passthroughEmailAdapter;
