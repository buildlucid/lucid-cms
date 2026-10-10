import constants from "../../../constants/constants.js";
import { DocumentHoldsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import holdTarget from "./hold-target.js";

/** Uses atomic writes to refresh a tab's hold, claim a free or expired hold, or explicitly take over a live hold, then returns the holder. */
const claimHold: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** The request whose proposal it is, or null for latest. */
			requestId: number | null;
			tabId: string;
			userId: number;
			takeOver: boolean;
		},
	],
	{ tabId: string; userId: number; heldAt: string } | undefined
> = async (context, data) => {
	const Holds = new DocumentHoldsRepository(context.db);
	const now = new Date();
	const staleBefore = new Date(
		now.getTime() - constants.documentEditors.ttlMs,
	).toISOString();
	const claim = {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		target: holdTarget(data.requestId),
		tabId: data.tabId,
		userId: data.userId,
		now: now.toISOString(),
	};

	const refreshed = await Holds.refresh(claim);
	if (refreshed.error) return refreshed;
	if (!refreshed.data) {
		const freed = await Holds.claimFree(claim);
		if (freed.error) return freed;
		if (!freed.data) {
			const taken = await Holds.claimHeld({
				...claim,
				staleBefore: data.takeOver ? undefined : staleBefore,
			});
			if (taken.error) return taken;
		}
	}

	const live = await Holds.selectLive({
		collectionKey: claim.collectionKey,
		documentId: claim.documentId,
		target: claim.target,
		seenAfter: staleBefore,
	});
	if (live.error) return live;

	const holder = live.data[0];
	return {
		error: undefined,
		data: holder && {
			tabId: holder.tab_id,
			userId: holder.user_id,
			heldAt: new Date(holder.held_at).toISOString(),
		},
	};
};

export default claimHold;
