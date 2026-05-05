import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import {
	DocumentPublishOperationAssigneesRepository,
	DocumentPublishOperationEventsRepository,
	DocumentPublishOperationsRepository,
	DocumentVersionsRepository,
} from "../../libs/repositories/index.js";
import T from "../../translations/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { collectionServices, documentVersionServices } from "../index.js";
import approve from "./approve.js";
import getReviewers from "./get-reviewers.js";
import {
	activePublishOperationStatuses,
	canUsePublishOperationsForTarget,
	hasCollectionTargetPermission,
	snapshotVersionType,
} from "./helpers/index.js";
import notifyPublishOperationUsers from "./notifications.js";

const createSingle: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
			comment?: string;
			assigneeIds?: number[];
			autoAccept?: boolean;
			user: LucidAuth;
		},
	],
	undefined
> = async (context, data) => {
	// Resolve collection and publish operation mode.
	const collectionRes = collectionServices.getSingleInstance(context, {
		key: data.collectionKey,
	});
	if (collectionRes.error) return collectionRes;

	const collection = collectionRes.data;
	const publishReview = collection.getData.config.publishing.review;
	const targetIsEnvironment = collection.getData.config.environments.some(
		(environment) => environment.key === data.target,
	);
	const requiresApproval = canUsePublishOperationsForTarget({
		collection,
		target: data.target,
	});
	const operationType = requiresApproval ? "request" : "direct";
	const comment = data.comment?.trim() || null;
	const autoAccept = data.autoAccept === true;
	const approveImmediately = !requiresApproval || autoAccept;

	// Validate target, permissions, and comments before touching document data.
	if (!targetIsEnvironment) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_target_not_enabled"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (
		!hasCollectionTargetPermission({
			user: data.user,
			collection,
			action: "publish",
			target: data.target,
		})
	) {
		return {
			error: {
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: data.collectionKey,
					action: "publish",
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		publishReview.comments.request === "required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_request_comment_required"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (autoAccept && publishReview.allowSelfApproval !== true) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_auto_accept_not_allowed"),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		autoAccept &&
		!hasCollectionTargetPermission({
			user: data.user,
			collection,
			action: "review",
			target: data.target,
		})
	) {
		return {
			error: {
				type: "basic",
				name: T("collection_permission_error_name"),
				message: T("collection_permission_error_message", {
					collection: data.collectionKey,
					action: "review",
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		autoAccept &&
		publishReview.comments.decision === "required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_decision_comment_required"),
				status: 400,
			},
			data: undefined,
		};
	}

	// Validate reviewer assignments only when this target requires approval.
	const reviewersRes = requiresApproval
		? await getReviewers(context, {
				collectionKey: data.collectionKey,
				target: data.target,
			})
		: undefined;
	if (reviewersRes?.error) return reviewersRes;

	const reviewerMap = new Map(
		(reviewersRes?.data ?? []).map((reviewer) => [reviewer.id, reviewer]),
	);
	const assigneeIds = Array.from(new Set(data.assigneeIds ?? []));
	const invalidAssignee = requiresApproval
		? assigneeIds.find((id) => !reviewerMap.has(id))
		: undefined;
	if (invalidAssignee !== undefined) {
		return {
			error: {
				type: "basic",
				message: T("publish_request_invalid_assignees"),
				status: 400,
			},
			data: undefined,
		};
	}

	// Load repositories and current document state.
	const Versions = new DocumentVersionsRepository(
		context.db.client,
		context.config.db,
	);
	const Operations = new DocumentPublishOperationsRepository(
		context.db.client,
		context.config.db,
	);
	const Assignees = new DocumentPublishOperationAssigneesRepository(
		context.db.client,
		context.config.db,
	);
	const Events = new DocumentPublishOperationEventsRepository(
		context.db.client,
		context.config.db,
	);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const [latestVersionRes, activeRes] = await Promise.all([
		Versions.selectSingle(
			{
				select: ["id", "content_id"],
				where: [
					{ key: "collection_key", operator: "=", value: data.collectionKey },
					{ key: "document_id", operator: "=", value: data.documentId },
					{ key: "type", operator: "=", value: "latest" },
				],
				validation: {
					enabled: true,
					defaultError: {
						message: T("document_version_not_found_message"),
						status: 404,
					},
				},
			},
			{
				tableName: tableNamesRes.data.version,
			},
		),
		Operations.selectSingle({
			select: ["id", "source_content_id"],
			where: [
				{ key: "collection_key", operator: "=", value: data.collectionKey },
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "target", operator: "=", value: data.target },
				{
					key: "status",
					operator: "=",
					value: activePublishOperationStatuses[0],
				},
			],
		}),
	]);
	if (latestVersionRes.error) return latestVersionRes;
	if (activeRes.error) return activeRes;

	const activeOperationMatchesLatest =
		activeRes.data?.source_content_id === latestVersionRes.data.content_id;

	if (requiresApproval && activeRes.data && activeOperationMatchesLatest) {
		if (approveImmediately) {
			const approveRes = await approve(context, {
				id: activeRes.data.id,
				comment: comment ?? undefined,
				user: data.user,
				bypassReviewChecks: !requiresApproval,
				suppressRequesterNotification: !requiresApproval,
			});
			return approveRes;
		}

		return {
			error: undefined,
			data: undefined,
		};
	}

	// If latest changed since the active request, retire the old request first.
	if (activeRes.data) {
		const now = new Date().toISOString();

		const [activeDetailedRes, supersedeRes, eventRes] = await Promise.all([
			Operations.selectSingleDetailed({
				where: [
					{
						key: "lucid_document_publish_operations.id",
						operator: "=",
						value: activeRes.data.id,
					},
				],
			}),
			Operations.updateSingle({
				where: [{ key: "id", operator: "=", value: activeRes.data.id }],
				data: {
					status: "superseded",
					updated_at: now,
				},
			}),
			Events.createSingle({
				data: {
					operation_id: activeRes.data.id,
					event_type: "superseded",
					user_id: data.user.id,
					comment,
					metadata: {
						sourceContentId: latestVersionRes.data.content_id,
					},
				},
			}),
		]);
		if (activeDetailedRes.error) return activeDetailedRes;
		if (supersedeRes.error) return supersedeRes;
		if (eventRes.error) return eventRes;

		if (activeDetailedRes.data) {
			const requestedBy = activeDetailedRes.data.requested_by;
			const requesterEmail = activeDetailedRes.data.requested_by_email;
			const requesterRecipients =
				requestedBy !== null &&
				requesterEmail !== undefined &&
				requesterEmail !== null &&
				requestedBy !== data.user.id
					? [{ id: requestedBy, email: requesterEmail }]
					: [];
			const supersedeRecipients = [
				...activeDetailedRes.data.assignees.map((assignee) => ({
					id: assignee.user_id,
					email: assignee.email ?? null,
				})),
				...requesterRecipients,
			];

			const notifySupersededRes = await notifyPublishOperationUsers(context, {
				operationId: activeDetailedRes.data.id,
				collectionKey: activeDetailedRes.data.collection_key,
				documentId: activeDetailedRes.data.document_id,
				recipients: supersedeRecipients,
				title: T("publish_request_replaced_title"),
				message: T("publish_request_replaced_message", {
					collection: data.collectionKey,
					documentId: data.documentId,
					target: data.target,
				}),
				dedupeAction: "superseded",
			});
			if (notifySupersededRes.error) return notifySupersededRes;
		}
	}

	// Snapshot the submitted latest version, then create the operation record.
	const snapshotRes = await documentVersionServices.cloneVersion(context, {
		fromVersionId: latestVersionRes.data.id,
		toVersionType: snapshotVersionType,
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		userId: data.user.id,
	});
	if (snapshotRes.error) return snapshotRes;

	if (snapshotRes.data.sourceVersionType !== "latest") {
		return {
			error: {
				type: "basic",
				message: T("publish_request_snapshot_latest_only"),
				status: 400,
			},
			data: undefined,
		};
	}

	const operationRes = await Operations.createSingle({
		data: {
			collection_key: data.collectionKey,
			document_id: data.documentId,
			target: data.target,
			operation_type: operationType,
			status: "pending",
			source_version_id: latestVersionRes.data.id,
			source_content_id: latestVersionRes.data.content_id,
			snapshot_version_id: snapshotRes.data.versionId,
			requested_by: data.user.id,
			request_comment: comment,
		},
		returning: ["id"],
		validation: {
			enabled: true,
		},
	});
	if (operationRes.error) return operationRes;

	if (requiresApproval && !autoAccept && assigneeIds.length > 0) {
		const assigneeRes = await Assignees.createMultiple({
			data: assigneeIds.map((userId) => ({
				operation_id: operationRes.data.id,
				user_id: userId,
				assigned_by: data.user.id,
			})),
		});
		if (assigneeRes.error) return assigneeRes;
	}

	const eventRes = await Events.createSingle({
		data: {
			operation_id: operationRes.data.id,
			event_type: "created",
			user_id: data.user.id,
			comment,
			metadata: {},
		},
	});
	if (eventRes.error) return eventRes;

	// Direct publishes and auto-accepted requests share the same approval path.
	if (approveImmediately) {
		const approveRes = await approve(context, {
			id: operationRes.data.id,
			comment: comment ?? undefined,
			user: data.user,
			bypassReviewChecks: !requiresApproval,
			suppressRequesterNotification: !requiresApproval,
		});
		return approveRes;
	}

	// Pending requests notify assigned reviewers, then refetch in the UI.
	const recipients = assigneeIds
		.map((id) => reviewerMap.get(id))
		.filter((reviewer) => reviewer !== undefined)
		.map((reviewer) => ({
			id: reviewer.id,
			email: reviewer.email,
		}));

	const notifyRes = await notifyPublishOperationUsers(context, {
		operationId: operationRes.data.id,
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		recipients,
		title: T("publish_request_created_title"),
		message: T("publish_request_created_message", {
			user: data.user.email,
			collection: data.collectionKey,
			documentId: data.documentId,
			target: data.target,
		}),
		dedupeAction: "created",
	});
	if (notifyRes.error) return notifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createSingle;
