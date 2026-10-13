import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import claimHold from "./helpers/claim-hold.js";
import getHolderName from "./helpers/get-holder-name.js";

/** Refreshes or reclaims an admin tab's version hold before saving, refusing the save if another tab holds it. */
const checkSaveHold: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** The request whose proposal is saved, or null for latest. */
			requestId: number | null;
			tabId: string;
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const holder = await claimHold(context, { ...data, takeOver: false });
	if (holder.error) return holder;
	if (!holder.data || holder.data.tabId === data.tabId) {
		return { error: undefined, data: undefined };
	}

	const name = await getHolderName(context, { userId: holder.data.userId });
	if (name.error) return name;

	return {
		data: undefined,
		error: {
			type: "basic",
			status: 409,
			code: constants.documentEditors.heldCode,
			name: copy("server:core.documents.editors.taken.name"),
			message: copy(
				holder.data.userId === data.userId
					? "server:core.documents.editors.taken.self.message"
					: "server:core.documents.editors.taken.message",
				{ data: { name: name.data } },
			),
		},
	};
};

export default checkSaveHold;
