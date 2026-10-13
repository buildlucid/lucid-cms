import { requestsFormatter } from "../../libs/formatters/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { RequestDetails } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAgentActors from "../agent/helpers/get-agent-actors.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";
import canEditDocument from "./helpers/can-edit-document.js";
import countOpenComments from "./helpers/count-open-comments.js";
import getBlockers from "./helpers/get-blockers.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestState from "./helpers/get-request-state.js";
import getRequiredApprovals from "./helpers/get-required-approvals.js";
import getReviewToken from "./helpers/get-review-token.js";
import getTargetAcknowledgement from "./helpers/get-target-acknowledgement.js";
import loadRequest from "./helpers/load-request.js";

const getSingle: ServiceFn<
	[{ id: number; user: LucidActor }],
	RequestDetails
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const request = requestRes.data;
	const [stateRes, usersRes, agentsRes] = await Promise.all([
		getRequestState(context, { request, labels: true }),
		getDisplayUsers(context, {
			ids: [
				request.created_by,
				...request.approvals.map((approval) => approval.user_id),
				...request.documents.flatMap((document) =>
					document.targets.map((target) => target.acknowledged_by),
				),
				...request.reviewers.map((reviewer) => reviewer.user_id),
				...request.events.flatMap((event) => [
					event.user_id,
					event.resolved_by,
					event.metadata?.userId ?? null,
				]),
			],
		}),
		getAgentActors(context, {
			runIds: [
				request.created_by_run_id,
				...request.documents.flatMap((document) =>
					document.targets.map((target) => target.acknowledged_by_run_id),
				),
				...request.events.flatMap((event) => [
					event.agent_run_id,
					event.resolved_by_run_id,
				]),
			],
		}),
	]);
	if (stateRes.error) return stateRes;
	if (usersRes.error) return usersRes;
	if (agentsRes.error) return agentsRes;

	const blockersRes = await getBlockers(context, {
		request,
		state: stateRes.data,
	});
	if (blockersRes.error) return blockersRes;

	const { read: _read, ...permissions } = getRequestAccess(context, {
		request,
		user: data.user,
	});

	return {
		error: undefined,
		data: requestsFormatter.formatSingle({
			request,
			state: stateRes.data,
			blockers: blockersRes.data,
			permissions,
			requiredApprovals: getRequiredApprovals(
				context,
				request.documents.map((document) => document.collection_key),
			),
			editableDocumentIds: new Set(
				request.documents
					.filter((document) =>
						canEditDocument({
							request,
							collectionKey: document.collection_key,
							user: data.user,
						}),
					)
					.map((document) => document.id),
			),
			acknowledgements: new Map(
				request.documents.flatMap((document) =>
					document.targets.map((target) => [
						target.id,
						getTargetAcknowledgement({
							target,
							requestDocumentId: document.id,
							events: request.events,
							currentVersionId:
								stateRes.data.get(document.id)?.versions.get(target.target)
									?.id ?? null,
						}),
					]),
				),
			),
			openComments: countOpenComments({ events: request.events }),
			reviewToken: getReviewToken({ request, state: stateRes.data }),
			users: usersRes.data,
			agents: agentsRes.data,
		}),
	};
};

export default getSingle;
