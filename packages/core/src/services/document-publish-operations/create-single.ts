import { getTableNames } from "../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import { copy } from "../../libs/i18n/index.js";
import {
	DocumentPublishOperationAssigneesRepository,
	DocumentPublishOperationsRepository,
	DocumentsRepository,
	DocumentVersionsRepository,
	QueueJobsRepository,
} from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	collectionServices,
	documentVersionServices,
	documentWorkflowServices,
} from "../index.js";
import approve from "./approve.js";
import getReviewers from "./get-reviewers.js";
import createEvent from "./helpers/create-event.js";
import {
	activePublishOperationStatuses,
	canUsePublishOperationsForTarget,
	collectionTargetSupportsScheduling,
	getReleaseRequirementTargets,
	getUnmetReleaseRequirementTargets,
	hasCollectionTargetPermission,
	parseScheduleInput,
	snapshotVersionType,
	unresolvedPublishOperationExecutionStatuses,
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
			scheduledAt?: string | null;
			scheduledTimezone?: string | null;
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
	const publishReview = collection.getData.review;
	const targetIsEnvironment = collection.getData.environments.some(
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
	const scheduleInput = parseScheduleInput({
		scheduledAt: data.scheduledAt,
		scheduledTimezone: data.scheduledTimezone,
	});
	if (scheduleInput.error) {
		return {
			error: scheduleInput.error,
			data: undefined,
		};
	}
	const schedule = scheduleInput.data;

	// Validate target, permissions, and comments before touching document data.
	if (!targetIsEnvironment) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.target.not.enabled"),
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
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: data.collectionKey,
						action: "publish",
					},
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		schedule?.scheduledAt &&
		!collectionTargetSupportsScheduling({
			collection,
			target: data.target,
			queueSupportsScheduling: context.queue.support.scheduling,
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.operations.schedule.not.supported"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		publishReview?.comments.request === "required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.request.comment.required"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		autoAccept &&
		publishReview?.allowSelfApproval !== true
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.auto.accept.not.allowed"),
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
				name: copy("server:core.collections.permission.error.name"),
				message: copy("server:core.collections.permission.error.message", {
					data: {
						collection: data.collectionKey,
						action: "review",
					},
				}),
				status: 403,
			},
			data: undefined,
		};
	}

	if (
		requiresApproval &&
		autoAccept &&
		publishReview?.comments.decision === "required" &&
		!comment
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.publish.requests.decision.comment.required"),
				status: 400,
			},
			data: undefined,
		};
	}

	const workflowPublishRes = await documentWorkflowServices.canPublishTarget(
		context,
		{
			collectionKey: data.collectionKey,
			documentId: data.documentId,
			target: data.target,
		},
	);
	if (workflowPublishRes.error) return workflowPublishRes;

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
				message: copy("server:core.publish.requests.invalid.assignees"),
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
	const Documents = new DocumentsRepository(
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
	const QueueJobs = new QueueJobsRepository(
		context.db.client,
		context.config.db,
	);

	const tableNamesRes = await getTableNames(context, data.collectionKey);
	if (tableNamesRes.error) return tableNamesRes;

	const [documentRes, latestVersionRes, activeRes] = await Promise.all([
		Documents.selectSingle(
			{
				select: ["id", "tenant_key"],
				where: [
					{ key: "id", operator: "=", value: data.documentId },
					{ key: "collection_key", operator: "=", value: data.collectionKey },
					{
						key: "is_deleted",
						operator: "=",
						value: context.config.db.getDefault("boolean", "false"),
					},
				],
				validation: {
					enabled: true,
					defaultError: {
						message: copy("server:core.documents.not.found.message"),
						status: 404,
					},
				},
			},
			{
				tableName: tableNamesRes.data.document,
			},
		),
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
						message: copy("server:core.documents.version.not.found.message"),
						status: 404,
					},
				},
			},
			{
				tableName: tableNamesRes.data.version,
			},
		),
		Operations.selectSingle({
			select: [
				"id",
				"collection_key",
				"document_id",
				"target",
				"source_content_id",
				"scheduled_job_id",
			],
			where: [
				{ key: "collection_key", operator: "=", value: data.collectionKey },
				{ key: "document_id", operator: "=", value: data.documentId },
				{ key: "target", operator: "=", value: data.target },
				{
					key: "status",
					operator: "in",
					value: activePublishOperationStatuses,
				},
				{
					key: "execution_status",
					operator: "in",
					value: unresolvedPublishOperationExecutionStatuses,
				},
			],
		}),
	]);
	if (documentRes.error) return documentRes;
	if (latestVersionRes.error) return latestVersionRes;
	if (activeRes.error) return activeRes;

	if (
		documentRes.data.tenant_key &&
		context.request.tenantKey &&
		documentRes.data.tenant_key !== context.request.tenantKey
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	// Checks the target environment's required environment list and that they are in sync with latest before allowing the publish
	const releaseRequirementTargets = getReleaseRequirementTargets({
		collection,
		target: data.target,
	});
	if (releaseRequirementTargets.length > 0) {
		const requirementVersionsRes = await Versions.selectMultiple(
			{
				select: ["type", "content_id"],
				where: [
					{ key: "collection_key", operator: "=", value: data.collectionKey },
					{ key: "document_id", operator: "=", value: data.documentId },
					{ key: "type", operator: "in", value: releaseRequirementTargets },
				],
			},
			{
				tableName: tableNamesRes.data.version,
			},
		);
		if (requirementVersionsRes.error) return requirementVersionsRes;

		const unmetRequirements = getUnmetReleaseRequirementTargets({
			collection,
			target: data.target,
			sourceContentId: latestVersionRes.data.content_id,
			contentIdsByTarget: new Map(
				(requirementVersionsRes.data ?? []).map((version) => [
					version.type,
					version.content_id,
				]),
			),
		});

		if (unmetRequirements.length > 0) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.publish.requests.requires.not.current", {
						data: {
							target: data.target,
							required: unmetRequirements.join(", "),
						},
					}),
					status: 403,
				},
				data: undefined,
			};
		}
	}

	// Retire any unresolved operation for this document and target before creating the new release
	if (activeRes.data) {
		const now = new Date().toISOString();

		if (activeRes.data.scheduled_job_id) {
			const cancelJobRes = await QueueJobs.updateSingle({
				where: [
					{
						key: "job_id",
						operator: "=",
						value: activeRes.data.scheduled_job_id,
					},
				],
				data: {
					status: "cancelled",
					updated_at: now,
				},
			});
			if (cancelJobRes.error) return cancelJobRes;
		}

		const [activeDetailedRes, supersedeRes] = await Promise.all([
			Operations.selectSingleDetailed({
				tenantKey: context.request.tenantKey,
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
					execution_status: "cancelled",
					scheduled_job_id: null,
					updated_at: now,
				},
			}),
		]);
		if (activeDetailedRes.error) return activeDetailedRes;
		if (supersedeRes.error) return supersedeRes;

		const eventRes = await createEvent(context, {
			operation: activeDetailedRes.data ?? activeRes.data,
			collectionInstance: collection,
			event: {
				type: "superseded",
				userId: data.user.id,
				comment,
				metadata: {
					sourceContentId: latestVersionRes.data.content_id,
				},
			},
		});
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
				title: copy("server:core.publish.requests.replaced.title"),
				message: copy("server:core.publish.requests.replaced.message", {
					data: {
						collection: data.collectionKey,
						documentId: data.documentId,
						target: data.target,
					},
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
				message: copy("server:core.publish.requests.snapshot.latest.only"),
				status: 400,
			},
			data: undefined,
		};
	}

	const operationRes = await Operations.createSingle({
		data: {
			collection_key: data.collectionKey,
			tenant_key: documentRes.data.tenant_key,
			document_id: data.documentId,
			target: data.target,
			operation_type: operationType,
			status: "pending",
			source_version_id: latestVersionRes.data.id,
			source_content_id: latestVersionRes.data.content_id,
			snapshot_version_id: snapshotRes.data.versionId,
			requested_by: data.user.id,
			request_comment: comment,
			scheduled_at: schedule?.scheduledAt ?? undefined,
			scheduled_timezone: schedule?.scheduledTimezone ?? null,
			execution_status: "awaiting_approval",
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

	const eventRes = await createEvent(context, {
		operation: {
			id: operationRes.data.id,
			collection_key: data.collectionKey,
			document_id: data.documentId,
			target: data.target,
		},
		collectionInstance: collection,
		event: {
			type: "created",
			userId: data.user.id,
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
		title: copy("server:core.publish.requests.created.title"),
		message: copy("server:core.publish.requests.created.message", {
			data: {
				user: data.user.email,
				collection: data.collectionKey,
				documentId: data.documentId,
				target: data.target,
			},
		}),
		dedupeAction: "created",
		comment: {
			label: copy("server:core.publish.requests.email.request.comment"),
			value: comment,
		},
		details: [
			{
				label: copy("server:core.publish.requests.email.detail.release"),
				value: `#${operationRes.data.id}`,
			},
			{
				label: copy("server:core.publish.requests.email.detail.collection"),
				value: data.collectionKey,
			},
			{
				label: copy("server:core.publish.requests.email.detail.document"),
				value: `#${data.documentId}`,
			},
			{
				label: copy("server:core.publish.requests.email.detail.target"),
				value: data.target,
			},
			{
				label: copy("server:core.publish.requests.email.detail.requested.by"),
				value: data.user.email,
			},
			{
				label: copy("server:core.publish.requests.email.detail.scheduled.for"),
				value: schedule?.scheduledAt,
			},
			{
				label: copy(
					"server:core.publish.requests.email.detail.scheduled.timezone",
				),
				value: schedule?.scheduledTimezone,
			},
		],
	});
	if (notifyRes.error) return notifyRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createSingle;
