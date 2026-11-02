import { copy } from "../../../libs/i18n/index.js";
import defineTransfer from "../../../libs/transfer/define-transfer.js";
import identifyUsers from "./identify.js";
import matchUsers from "./match.js";

/** Keeps links to users when importing on the site they belong to. Users are never exported or created. */
const usersTransfer = defineTransfer({
	key: "users",
	label: {
		singular: copy("server:core.transfer.users.singular"),
		plural: copy("server:core.transfer.users.plural"),
	},
	identify: identifyUsers,
	match: matchUsers,
});

export default usersTransfer;
