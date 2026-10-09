import type { LucidActor } from "../../../../types/hono.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import loadRequest from "../../helpers/load-request.js";
import type { RequestRecord } from "../../types.js";
import type { RequestToolProps } from "../types.js";
import checkCollections from "./check-collections.js";

/** Loads a request as the actor, treating requests outside the tool's collections as not found. */
const loadToolRequest: ServiceFn<
	[RequestToolProps & { id: number }],
	{ user: LucidActor; request: RequestRecord }
> = async (context, props) => {
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const requestRes = await loadRequest(context, {
		id: props.id,
		user: userRes.data,
	});
	if (requestRes.error) return requestRes;

	const collectionsRes = checkCollections({
		collectionKeys: requestRes.data.documents.map(
			(document) => document.collection_key,
		),
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (collectionsRes.error) return collectionsRes;

	return {
		error: undefined,
		data: { user: userRes.data, request: requestRes.data },
	};
};

export default loadToolRequest;
