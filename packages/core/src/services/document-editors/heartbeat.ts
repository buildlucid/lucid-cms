import { DocumentHoldsRepository } from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { DocumentEditors } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getUpdateContext from "../documents-versions/helpers/get-update-context.js";
import getRequestUsers from "../requests/helpers/get-request-users.js";
import claimHold from "./helpers/claim-hold.js";
import holdTarget from "./helpers/hold-target.js";
import resolveHeldVersion from "./helpers/resolve-held-version.js";

/** Records a tab's document version and claims or takes over its hold using current save permissions; displaced tabs learn on their next heartbeat or save. */
const heartbeat: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			/** The request whose proposal is open, or null for latest. */
			requestId: number | null;
			tabId: string;
			user: LucidUser;
			takeOver: boolean;
		},
	],
	DocumentEditors
> = async (context, data) => {
	const version = await resolveHeldVersion(context, data);
	if (version.error) return version;

	const access = await getUpdateContext(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: version.data,
		authUser: data.user,
	});
	if (access.error) return access;

	//* a tab that moved to another version of the document lets go of the last one
	const Holds = new DocumentHoldsRepository(context.db);
	const moved = await Holds.deleteMultiple({
		where: [
			{ key: "collection_key", operator: "=", value: data.collectionKey },
			{ key: "document_id", operator: "=", value: data.documentId },
			{ key: "tab_id", operator: "=", value: data.tabId },
			{ key: "target", operator: "!=", value: holdTarget(data.requestId) },
		],
	});
	if (moved.error) return moved;

	const holder = await claimHold(context, {
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		requestId: data.requestId,
		tabId: data.tabId,
		userId: data.user.id,
		takeOver: data.takeOver,
	});
	if (holder.error) return holder;
	if (!holder.data || holder.data.tabId === data.tabId) {
		return {
			error: undefined,
			data: { holding: holder.data !== undefined, holder: null },
		};
	}

	const users = await getRequestUsers(context, { ids: [holder.data.userId] });
	if (users.error) return users;

	const user = users.data.get(holder.data.userId);
	return {
		error: undefined,
		data: {
			holding: false,
			holder: user
				? {
						user,
						self: holder.data.userId === data.user.id,
						since: holder.data.heldAt,
					}
				: null,
		},
	};
};

export default heartbeat;
