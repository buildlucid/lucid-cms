import type { RichTextJSON } from "@lucidcms/rich-text";
import constants from "../../constants/constants.js";
import { copy } from "../../libs/i18n/index.js";
import {
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestsRepository,
	RequestTargetsRepository,
} from "../../libs/repositories/index.js";
import type { LucidUser } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import cloneVersion from "../documents-versions/clone-version.js";
import validateVersionContent from "../documents-versions/helpers/validate-version-content.js";
import acquireRequestWrites from "./helpers/acquire-request-writes.js";
import addReviewer from "./helpers/add-reviewer.js";
import countOpenComments from "./helpers/count-open-comments.js";
import deleteVersions from "./helpers/delete-versions.js";
import getBlockers from "./helpers/get-blockers.js";
import getRequestAccess from "./helpers/get-request-access.js";
import getRequestState from "./helpers/get-request-state.js";
import scheduleRequest from "./helpers/schedule-request.js";

/**
 * Approves the current revision. Proposal content is frozen into a
 * snapshot; environment requests retain their existing immutable snapshot.
 */
const approve: ServiceFn<
	[
		{
			id: number;
			user: LucidUser;
			body?: RichTextJSON;
			revision: number;
			expectedTargets: Record<string, Record<string, number | null>>;
		},
	],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const Requests = new RequestsRepository(context.db);
	const RequestTargets = new RequestTargetsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const claimRes = await acquireRequestWrites(context, data);
	if (claimRes.error) return claimRes;
	await using _claims = claimRes.data.claims;

	const request = claimRes.data.request;
	if (!getRequestAccess(context, { request, user: data.user }).approve) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.permission"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (request.approved_revision === request.revision) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.already.approved"),
				status: 409,
			},
			data: undefined,
		};
	}

	if (countOpenComments({ events: request.events }) > 0) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.comments.open"),
				status: 409,
			},
			data: undefined,
		};
	}

	const stateRes = await getRequestState(context, { request });
	if (stateRes.error) return stateRes;

	const states = stateRes.data;
	if (
		data.revision !== request.revision ||
		Object.keys(data.expectedTargets).length !== request.documents.length ||
		request.documents.some((document) => {
			const expected = data.expectedTargets[document.id];
			const state = states.get(document.id);
			return (
				!expected ||
				!state ||
				Object.keys(expected).length !== document.targets.length ||
				document.targets.some(
					(target) =>
						!Object.hasOwn(expected, target.target) ||
						expected[target.target] !==
							(state.versions.get(target.target)?.id ?? null),
				)
			);
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.review.changed"),
				status: 409,
			},
			data: undefined,
		};
	}

	const blockersRes = await getBlockers(context, { request, state: states });
	if (blockersRes.error) return blockersRes;
	if (blockersRes.data.length > 0) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.blocked"),
				status: 409,
			},
			data: undefined,
		};
	}

	for (const document of request.documents) {
		const state = states.get(document.id);
		if (!state?.collection || !state.source) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.requests.blocked"),
					status: 409,
				},
				data: undefined,
			};
		}
		const validateRes = await validateVersionContent(context, {
			collection: state.collection,
			documentId: document.document_id,
			versionId: state.source.id,
			user: data.user,
		});
		if (validateRes.error) return validateRes;

		let approvedVersionId = state.source.id;
		if (document.source === "latest") {
			const snapshotRes = await cloneVersion(context, {
				collectionKey: document.collection_key,
				documentId: document.document_id,
				fromVersionId: state.source.id,
				toVersionType:
					constants.collectionBuilder.publishing.snapshotVersionType,
				userId: data.user.id,
			});
			if (snapshotRes.error) return snapshotRes;

			approvedVersionId = snapshotRes.data.versionId;
		}

		for (const target of document.targets) {
			const targetRes = await RequestTargets.updateSingle({
				data: {
					approved_version_id: state.versions.get(target.target)?.id ?? null,
				},
				where: [{ key: "id", operator: "=", value: target.id }],
			});
			if (targetRes.error) return targetRes;
		}

		const documentRes = await RequestDocuments.updateSingle({
			data: {
				approved_version_id: approvedVersionId,
				approved_workflow_stage: state.workflowStage,
			},
			where: [{ key: "id", operator: "=", value: document.id }],
		});
		if (documentRes.error) return documentRes;

		//* a snapshot from an earlier approval is no longer needed
		if (
			document.approved_version_id !== null &&
			document.approved_version_id !== document.source_version_id &&
			document.approved_version_id !== approvedVersionId
		) {
			const previousRes = await deleteVersions(context, {
				collectionKey: document.collection_key,
				documentId: document.document_id,
				versionIds: [document.approved_version_id],
			});
			if (previousRes.error) return previousRes;
		}
	}

	const reviewerRes = await addReviewer(context, {
		request,
		userId: data.user.id,
	});
	if (reviewerRes.error) return reviewerRes;

	const updateRes = await Requests.updateSingle({
		data: {
			approved_revision: request.revision,
			approved_by: data.user.id,
			approved_at: new Date().toISOString(),
			failure: null,
			failure_request_document_id: null,
			failure_target: null,
			updated_at: new Date().toISOString(),
		},
		where: [{ key: "id", operator: "=", value: request.id }],
	});
	if (updateRes.error) return updateRes;

	const eventsRes = await RequestEvents.createEvents({
		data: [
			{
				request_id: request.id,
				user_id: data.user.id,
				type: "approved",
				body: data.body ?? null,
			},
		],
	});
	if (eventsRes.error) return eventsRes;

	const scheduleRes = await scheduleRequest(context, {
		id: request.id,
		skipRequestWriteClaim: true,
	});
	if (scheduleRes.error) return scheduleRes;

	return { error: undefined, data: undefined };
};

export default approve;
