import { copy } from "../../../libs/i18n/index.js";
import {
	RequestApprovalsRepository,
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestReviewersRepository,
	RequestsRepository,
	RequestTargetsRepository,
} from "../../../libs/repositories/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestRecord } from "../types.js";
import getRequestAccess from "./get-request-access.js";

/**
 * Loads a request with its document, targets, reviewers, current approvals and activity. When a
 * user is given, requests they cannot read are reported as not found.
 */
const loadRequest: ServiceFn<
	[{ id: number; user?: LucidActor }],
	RequestRecord
> = async (context, data) => {
	const Requests = new RequestsRepository(context.db);
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestTargets = new RequestTargetsRepository(context.db);
	const RequestReviewers = new RequestReviewersRepository(context.db);
	const RequestApprovals = new RequestApprovalsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const [
		requestRes,
		documentsRes,
		targetsRes,
		reviewersRes,
		approvalsRes,
		eventsRes,
	] = await Promise.all([
		Requests.selectSingle({
			select: [
				"id",
				"type",
				"title",
				"description",
				"status",
				"revision",
				"approved_revision",
				"scheduled_at",
				"scheduled_timezone",
				"scheduled_by",
				"scheduled_by_system",
				"scheduled_by_run_id",
				"execution_job_id",
				"failure",
				"failure_request_document_id",
				"failure_target",
				"completed_at",
				"lock_token",
				"created_by",
				"created_by_run_id",
				"created_at",
				"updated_at",
			],
			where: [{ key: "id", operator: "=", value: data.id }],
		}),
		RequestDocuments.selectMultiple({
			select: [
				"id",
				"request_id",
				"collection_key",
				"document_id",
				"source",
				"source_version_id",
				"approved_version_id",
				"approved_workflow_stage",
			],
			where: [{ key: "request_id", operator: "=", value: data.id }],
			orderBy: [{ column: "id", direction: "asc" }],
		}),
		RequestTargets.selectForRequest({ id: data.id }),
		RequestReviewers.selectMultiple({
			select: ["id", "request_id", "user_id", "assigned_by", "assigned_at"],
			where: [{ key: "request_id", operator: "=", value: data.id }],
			orderBy: [{ column: "assigned_at", direction: "asc" }],
		}),
		RequestApprovals.selectMultiple({
			select: ["id", "request_id", "user_id", "revision", "approved_at"],
			where: [{ key: "request_id", operator: "=", value: data.id }],
			orderBy: [{ column: "approved_at", direction: "asc" }],
		}),
		RequestEvents.selectMultiple({
			select: [
				"id",
				"request_id",
				"user_id",
				"agent_run_id",
				"parent_id",
				"type",
				"body",
				"metadata",
				"resolution",
				"resolved_by",
				"resolved_by_run_id",
				"resolved_at",
				"created_at",
				"updated_at",
			],
			where: [{ key: "request_id", operator: "=", value: data.id }],
			orderBy: [
				{ column: "created_at", direction: "asc" },
				{ column: "id", direction: "asc" },
			],
		}),
	]);
	if (requestRes.error) return requestRes;
	if (documentsRes.error) return documentsRes;
	if (targetsRes.error) return targetsRes;
	if (reviewersRes.error) return reviewersRes;
	if (approvalsRes.error) return approvalsRes;
	if (eventsRes.error) return eventsRes;

	if (!requestRes.data) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	const targetsByDocument = Map.groupBy(
		targetsRes.data ?? [],
		(target) => target.request_document_id,
	);
	const revision = requestRes.data.revision;
	const request: RequestRecord = {
		...requestRes.data,
		documents: (documentsRes.data ?? []).map((document) => ({
			...document,
			targets: targetsByDocument.get(document.id) ?? [],
		})),
		reviewers: reviewersRes.data ?? [],
		approvals: (approvalsRes.data ?? []).filter(
			(approval) => approval.revision === revision,
		),
		events: eventsRes.data ?? [],
	};

	if (
		data.user &&
		!getRequestAccess(context, { request, user: data.user }).read
	) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: request };
};

export default loadRequest;
