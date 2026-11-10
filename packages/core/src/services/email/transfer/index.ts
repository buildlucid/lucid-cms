import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import { LucidError } from "../../../utils/errors/index.js";
import identifyEmails from "./identify.js";
import matchEmails from "./match.js";

/** Keeps links to sent emails when importing on the site they were sent from. Emails are never exported or created. */
const emailsTransfer = defineTransfer({
	key: "emails",
	label: {
		singular: copy("server:core.transfer.emails.singular"),
		plural: copy("server:core.transfer.emails.plural"),
	},
	identify: async ({ context, ...props }) => {
		const result = await identifyEmails(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	match: async ({ context, ...props }) => {
		const result = await matchEmails(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
});

export default emailsTransfer;
