import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import { LucidError } from "../../../utils/errors/index.js";
import identifyUsers from "./identify.js";
import matchUsers from "./match.js";

/** Keeps links to users when importing on the site they belong to. Users are never exported or created. */
const usersTransfer = defineTransfer({
	key: "users",
	label: {
		singular: copy("server:core.transfer.users.singular"),
		plural: copy("server:core.transfer.users.plural"),
	},
	identify: async ({ context, ...props }) => {
		const result = await identifyUsers(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
	match: async ({ context, ...props }) => {
		const result = await matchUsers(context, props);
		if (result.error) throw new LucidError(result.error);
		return result.data;
	},
});

export default usersTransfer;
