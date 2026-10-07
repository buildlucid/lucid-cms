import collections from "../../libs/collection/collections.js";
import { copy } from "../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import createTargets from "./helpers/create-targets.js";
import dismissApproval from "./helpers/dismiss-approval.js";
import getLatestChange from "./helpers/get-latest-change.js";
import getRequestAccess from "./helpers/get-request-access.js";
import resolveTargets from "./helpers/resolve-targets.js";

const updateTargets: ServiceFn<
	[
		{
			id: number;
			requestDocumentId: number;
			user: LucidUser;
			targets: string[];
		},
	],
	undefined
> = async (context, data) => {
	const RequestTargets = new RequestTargetsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const request = claimRes.data.request;
	if (!getRequestAccess(context, { request, user: data.user }).edit) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (request.type === "create") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.create.fixed"),
				status: 400,
			},
			data: undefined,
		};
	}

	const document = request.documents.find(
		(document) => document.id === data.requestDocumentId,
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

	const collectionRes = await collections.getSingle(context, {
		key: document.collection_key,
	});
	if (collectionRes.error) return collectionRes;

	const targetsRes = resolveTargets({
		collection: collectionRes.data,
		source: document.source,
		targets: data.targets,
	});
	if (targetsRes.error) return targetsRes;

	const targets = targetsRes.data;
	const removed = document.targets.filter(
		(target) => !targets.includes(target.target),
	);
	const added = targets.filter(
		(target) => !document.targets.some((other) => other.target === target),
	);
	if (removed.length === 0 && added.length === 0) {
		return { error: undefined, data: undefined };
	}

	if (removed.length > 0) {
		const deleteRes = await RequestTargets.deleteMultiple({
			where: [
				{
					key: "id",
					operator: "in",
					value: removed.map((target) => target.id),
				},
			],
		});
		if (deleteRes.error) return deleteRes;
	}

	const addedRes = await createTargets(context, {
		requestDocumentId: document.id,
		targets: added,
	});
	if (addedRes.error) return addedRes;

	//* latest edits are only recorded while latest is a target, so earlier ones are caught here
	const latestRes =
		added.includes("latest") && document.source_version_id !== null
			? await getLatestChange(context, {
					collectionKey: document.collection_key,
					documentId: document.document_id,
					proposalId: document.source_version_id,
				})
			: undefined;
	if (latestRes?.error) return latestRes;
	const latestChange = latestRes?.data;

	const eventsRes = await RequestEvents.createEvents({
		data: [
			...added.map((target) => ({
				request_id: request.id,
				user_id: data.user.id,
				type: "target_added" as const,
				metadata: { requestDocumentId: document.id, target },
			})),
			...removed.map((target) => ({
				request_id: request.id,
				user_id: data.user.id,
				type: "target_removed" as const,
				metadata: { requestDocumentId: document.id, target: target.target },
			})),
			...(latestChange
				? [
						{
							request_id: request.id,
							user_id: latestChange.userId,
							type: "target_published" as const,
							metadata: {
								requestDocumentId: document.id,
								target: "latest",
								sourceRequestId: null,
							},
						},
					]
				: []),
		],
	});
	if (eventsRes.error) return eventsRes;

	const dismissRes = await dismissApproval(context, {
		ids: [request.id],
		userId: data.user.id,
	});
	if (dismissRes.error) return dismissRes;

	return { error: undefined, data: undefined };
};

export default updateTargets;
