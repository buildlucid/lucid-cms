import { copy } from "../../libs/i18n/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDocumentBlockers from "./helpers/get-document-blockers.js";
import getRequestState from "./helpers/get-request-state.js";
import getReviewToken from "./helpers/get-review-token.js";
import loadRequest from "./helpers/load-request.js";
import reviewTarget from "./review-target.js";

type AcknowledgedTarget = {
	collectionKey: string;
	documentId: number;
	target: string;
};

/** Acknowledges selected or pending target changes against a review token, rechecking each target before updating it. */
const acknowledge: ServiceFn<
	[
		{
			id: number;
			user: LucidActor;
			agentRunId?: string;
			ifUnchanged: string;
			targets?: AcknowledgedTarget[];
		},
	],
	{ targets: AcknowledgedTarget[] }
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const stateRes = await getRequestState(context, { request });
	if (stateRes.error) return stateRes;

	const state = stateRes.data;
	if (getReviewToken({ request, state }) !== data.ifUnchanged) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.acknowledge.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const targets =
		data.targets ??
		request.documents.flatMap((document) => {
			const documentState = state.get(document.id);
			if (!documentState) return [];

			return getDocumentBlockers(context, {
				request,
				document,
				state: documentState,
			}).flatMap((blocker) =>
				blocker.code === "review_required" && blocker.target
					? [
							{
								collectionKey: document.collection_key,
								documentId: document.document_id,
								target: blocker.target,
							},
						]
					: [],
			);
		});

	for (const target of targets) {
		const document = request.documents.find(
			(document) =>
				document.collection_key === target.collectionKey &&
				document.document_id === target.documentId,
		);
		if (!document) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.document.not.found"),
					status: 404,
				},
				data: undefined,
			};
		}

		const reviewRes = await reviewTarget(context, {
			id: request.id,
			requestDocumentId: document.id,
			target: target.target,
			revision: request.revision,
			targetVersionId:
				state.get(document.id)?.versions.get(target.target)?.id ?? null,
			reviewed: true,
			user: data.user,
			agentRunId: data.agentRunId,
		});
		if (reviewRes.error) return reviewRes;
	}

	return { error: undefined, data: { targets } };
};

export default acknowledge;
