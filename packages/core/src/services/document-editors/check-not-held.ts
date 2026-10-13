import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import { DocumentHoldsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getHolderName from "./helpers/get-holder-name.js";
import holdTarget from "./helpers/hold-target.js";

/** Rejects agent writes to held document versions to protect unsaved editor changes. */
const checkNotHeld: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** The request whose proposal changes, null for latest, or undefined for any version. */
			requestId: number | null | undefined;
			/** The person the change is for, who is told to use the builder tools instead. */
			userId?: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const Holds = new DocumentHoldsRepository(context.db);

	const live = await Holds.selectLive({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		target:
			data.requestId === undefined ? undefined : holdTarget(data.requestId),
		seenAfter: new Date(
			Date.now() - constants.documentEditors.ttlMs,
		).toISOString(),
	});
	if (live.error) return live;

	const holder = live.data[0];
	if (!holder) return { error: undefined, data: undefined };

	if (holder.user_id === data.userId) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				name: copy("server:core.documents.editors.held.name"),
				message: copy("server:core.documents.editors.held.self.message"),
			},
		};
	}

	const name = await getHolderName(context, { userId: holder.user_id });
	if (name.error) return name;

	return {
		data: undefined,
		error: {
			type: "basic",
			status: 409,
			name: copy("server:core.documents.editors.held.name"),
			message: copy("server:core.documents.editors.held.message", {
				data: { name: name.data },
			}),
		},
	};
};

export default checkNotHeld;
