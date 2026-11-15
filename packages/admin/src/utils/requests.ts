import type {
	Collection,
	RequestBlocker,
	RequestDetails,
	RequestDocument,
	RequestEvent,
	RequestOverview,
	RequestOverviewCounts,
	RequestSummary,
	RequestTarget,
	RequestType,
} from "@types";
import type { PillVariant } from "@/components/Pill/Pill";
import type { StatusIndicatorVariant } from "@/components/StatusIndicator/StatusIndicator";
import { Permissions } from "@/constants/permissions";
import type { FilterState } from "@/hooks/useQueryState/useQueryState";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Open-request queues in Home order, shared with Requests presets and counted across all request types. */
export const requestQueues = [
	{
		key: "assigned",
		count: "assignedToMe",
		label: () => T()("requests.filter.assigned"),
		indicator: "primary-subtle",
		filters: {
			status: { value: "open", operator: "=" },
			assignedToMe: { value: true, operator: "=" },
		},
	},
	{
		key: "pending",
		count: "awaitingApproval",
		label: () => T()("requests.state.pending"),
		indicator: "warning-subtle",
		filters: {
			status: { value: "open", operator: "=" },
			approval: { value: "pending", operator: "=" },
		},
	},
	{
		key: "approved",
		count: "approved",
		label: () => T()("requests.state.approved"),
		indicator: "success-subtle",
		filters: {
			status: { value: "open", operator: "=" },
			approval: { value: "approved", operator: "=" },
		},
	},
	{
		key: "failed",
		count: "failed",
		label: () => T()("requests.state.failed"),
		indicator: "danger-subtle",
		filters: {
			status: { value: "open", operator: "=" },
			failed: { value: true, operator: "=" },
		},
	},
] as const satisfies ReadonlyArray<{
	key: string;
	count: keyof RequestOverviewCounts;
	label: () => string;
	indicator: StatusIndicatorVariant;
	filters: Record<string, FilterState>;
}>;

export type RequestQueue = (typeof requestQueues)[number];

/** How many open requests of every type are in a queue. */
export const countRequestQueue = (
	overview: RequestOverview,
	queue: RequestQueue,
) =>
	Object.values(overview).reduce(
		(total, counts) => total + counts[queue.count],
		0,
	);

export const getRequestQueueRoute = (queue: RequestQueue) =>
	`/admin/requests?${Object.entries(queue.filters)
		.map(
			([key, filter]) =>
				`filter[${key}]=${typeof filter.value === "boolean" ? Number(filter.value) : filter.value}`,
		)
		.join("&")}`;

/** How each request type is labelled, in the order lists and presets show them. */
export const requestTypes: Record<
	RequestType,
	{
		label: () => string;
		tooltip: () => string;
		filter: () => string;
		pill: PillVariant;
	}
> = {
	publish: {
		label: () => T()("requests.type.publish"),
		tooltip: () => T()("requests.type.publish.tooltip"),
		filter: () => T()("requests.filter.publish"),
		pill: "outline",
	},
	create: {
		label: () => T()("requests.type.create"),
		tooltip: () => T()("requests.type.create.tooltip"),
		filter: () => T()("requests.filter.requests"),
		pill: "blue-subtle",
	},
	update: {
		label: () => T()("requests.type.update"),
		tooltip: () => T()("requests.type.update.tooltip"),
		filter: () => T()("requests.filter.update"),
		pill: "primary-subtle",
	},
	unpublish: {
		label: () => T()("requests.type.unpublish"),
		tooltip: () => T()("requests.type.unpublish.tooltip"),
		filter: () => T()("requests.filter.unpublish"),
		pill: "warning-subtle",
	},
	delete: {
		label: () => T()("requests.type.delete"),
		tooltip: () => T()("requests.type.delete.tooltip"),
		filter: () => T()("requests.filter.delete"),
		pill: "danger-subtle",
	},
};
export const requestTypeKeys = Object.keys(requestTypes) as RequestType[];

export type RequestState =
	| "completed"
	| "closed"
	| "failed"
	| "approved"
	| "pending";

export const getRequestState = (
	request: RequestDetails | RequestSummary,
): RequestState => {
	if (request.status === "completed") return "completed";
	if (request.status === "closed") return "closed";
	if (request.failure) return "failed";
	return request.approved ? "approved" : "pending";
};

/** Whether the signed in user has approved the request's current revision. */
export const hasApproved = (request: RequestDetails) =>
	request.approvals.some(
		(approval) => approval.user?.id === userStore.get.user?.id,
	);

/**
 * How many approvals the request would have once the user approves. An
 * earlier approval counts once, and can approve the request on its own once
 * its collections need fewer.
 */
export const getApprovalsAfter = (request: RequestDetails) =>
	request.approvals.length + (hasApproved(request) ? 0 : 1);

export const requestStates: Record<
	RequestState,
	{
		label: () => string;
		pill: PillVariant;
		indicator: StatusIndicatorVariant;
	}
> = {
	completed: {
		label: () => T()("requests.state.completed"),
		pill: "purple-subtle",
		indicator: "purple-subtle",
	},
	closed: {
		label: () => T()("requests.state.closed"),
		pill: "outline",
		indicator: "neutral-subtle",
	},
	failed: {
		label: () => T()("requests.state.failed"),
		pill: "danger-subtle",
		indicator: "danger-subtle",
	},
	approved: {
		label: () => T()("requests.state.approved"),
		pill: "success-subtle",
		indicator: "success-subtle",
	},
	pending: {
		label: () => T()("requests.state.pending"),
		pill: "warning-subtle",
		indicator: "warning-subtle",
	},
};

/** Labels a request target's changes and acknowledgement status. */
export const getTargetStatus = (
	request: RequestDetails,
	target: RequestTarget,
): {
	label: string;
	tone: "warning" | "default" | "muted" | "success";
} | null => {
	if (request.status === "completed") {
		return { label: T()("requests.target.status.completed"), tone: "success" };
	}
	if (request.status === "closed") return null;
	if (target.changedSinceCreation) {
		return {
			label: target.acknowledged
				? T()("requests.target.status.acknowledged")
				: T()("requests.target.status.acknowledge.required"),
			tone: target.acknowledged ? "success" : "warning",
		};
	}
	if (target.changed) {
		return { label: T()("requests.target.status.changes"), tone: "default" };
	}
	return { label: T()("requests.target.status.none"), tone: "muted" };
};

/** Labels latest, proposals and environments the way editors see them. */
export const getTargetLabel = (
	collection: Collection | undefined,
	target: string,
) => {
	if (target === "latest") return T()("requests.target.latest");
	if (target === "proposal") return T()("requests.target.proposal");

	const environment = collection?.publishing.environments.find(
		(environment) => environment.key === target,
	);
	return (
		helpers.getLocaleValue({ value: environment?.label, fallback: target }) ||
		target
	);
};

/** Lists the environments a publish source can move to, in request order, returning none when the request has no source. */
export const getAllowedTargets = (
	collection:
		| { publishing: { environments: Array<{ key: string }> } }
		| undefined,
	source: string | null,
) => {
	if (source === null) return [];

	const environments = (collection?.publishing.environments ?? []).map(
		(environment) => environment.key,
	);
	if (source === "latest") return environments;

	const index = environments.indexOf(source);
	return index === -1 ? [] : environments.slice(index + 1);
};

/** New publish requests start on the first environment they can move to. */
export const getDefaultTargets = (
	collection:
		| { publishing: { environments: Array<{ key: string }> } }
		| undefined,
	source: string,
) => getAllowedTargets(collection, source).slice(0, 1);

/** Whether a request type's proposals are edited, as create and update requests change content while publish requests only move it. */
export const changesContent = (type: RequestType) =>
	type === "create" || type === "update";

/**
 * Resolves direct, proposed or denied access to latest content. Collections requiring update
 * review allow proposals only.
 */
export type LatestAccess = "direct" | "request" | null;

/** Whether a request document is a publish request's copy of latest, which can't be edited but can be refreshed from latest. */
export const isLatestCopy = (
	type: RequestType,
	document: Pick<RequestDocument, "source"> | undefined,
) => type === "publish" && document?.source === "latest";

/**
 * The ways a modal can change content, default first: straight away, or in a new update request
 * for latest. Anyone who can change latest can also propose it. Leave out `latestAccess` for
 * versions other than latest, which always change straight away.
 */
export const getChangeModes = (
	latestAccess?: LatestAccess,
): Array<"now" | "request"> => {
	if (latestAccess === undefined) return ["now"];
	if (latestAccess === "direct") return ["now", "request"];
	if (latestAccess === "request") return ["request"];
	return [];
};

/**
 * Whether someone takes part in requests, so the Requests screens are worth showing: they can
 * read every request, or make, review or complete requests in a collection they can read.
 * Core shows people the requests they made or were asked to review too.
 */
export const canTakePartInRequests = (
	collections: Array<Pick<Collection, "permissions">>,
) =>
	userStore.get.hasPermission([Permissions.RequestsRead]).all ||
	collections.some(
		({ permissions }) =>
			userStore.get.hasPermission([permissions.read]).all &&
			userStore.get.hasPermission([
				permissions.create,
				permissions.createRequest,
				permissions.update,
				permissions.updateRequest,
				permissions.publish,
				permissions.publishRequest,
				permissions.delete,
				permissions.deleteRequest,
				permissions.review,
			]).some,
	);

/** Whether the person made an open request but can no longer change it, so screens explain why it's locked. */
export const isLockedForCreator = (
	request: Pick<RequestDetails, "status" | "createdBy" | "permissions">,
) =>
	request.status === "open" &&
	!request.permissions.edit &&
	request.createdBy?.id !== undefined &&
	request.createdBy.id === userStore.get.user?.id;

/**
 * Whether someone can add a collection's documents to a request: the action covers anyone's
 * request, and its request permission covers a new request or one they made, as core checks.
 */
export const canAddToRequest = (
	collection: Collection,
	action: "update" | "publish" | "delete",
	request?: Pick<RequestDetails, "createdBy">,
) => {
	const own =
		request === undefined || request.createdBy?.id === userStore.get.user?.id;
	return (
		userStore.get.hasPermission([collection.permissions.read]).all &&
		userStore.get.hasPermission(
			own
				? [
						collection.permissions[action],
						collection.permissions[`${action}Request`],
					]
				: [collection.permissions[action]],
		).some
	);
};

/**
 * Resolves direct, proposed or denied access to latest content. Collections requiring update
 * review allow proposals only.
 */
export const getLatestAccess = (
	collection: Collection | undefined,
): LatestAccess => {
	if (!collection) return null;

	const { update, updateRequest } = collection.permissions;
	if (
		collection.publishing.review?.update !== true &&
		userStore.get.hasPermission([update]).all
	) {
		return "direct";
	}

	return userStore.get.hasPermission([update, updateRequest]).some
		? "request"
		: null;
};

/**
 * The ways someone can add documents to a collection, default first: create
 * them straight away, or request them through a create request. Creating is
 * unavailable when the collection reviews new documents. Anyone who can
 * create can also choose to request.
 */
export const getDocumentCreateActions = (
	collection: Collection | undefined,
): Array<"create" | "request"> => {
	if (!collection) return [];

	const canCreate =
		collection.publishing.review?.create !== true &&
		userStore.get.hasPermission([collection.permissions.create]).all;
	const canRequest =
		collection.mode === "multiple" &&
		userStore.get.hasPermission([
			collection.permissions.create,
			collection.permissions.createRequest,
		]).some;

	return [
		...(canCreate ? (["create"] as const) : []),
		...(canRequest ? (["request"] as const) : []),
	];
};

/** The open proposals a document has in create and update requests, with their editable versions. */
export const getDocumentProposals = (
	requests: RequestSummary[],
	document: { collectionKey: string; documentId: number | undefined },
) =>
	requests.flatMap((request) => {
		const member = request.documents.find(
			(member) =>
				member.collectionKey === document.collectionKey &&
				member.documentId === document.documentId,
		);
		return changesContent(request.type) &&
			member?.source === "latest" &&
			member.versionId !== null
			? [{ request, document: member, versionId: member.versionId }]
			: [];
	});

export const getRequestDocumentLabel = (
	request: Pick<
		RequestDocument,
		"collectionKey" | "documentId" | "documentLabel"
	>,
	collection: Collection | undefined,
) =>
	request.documentLabel ||
	`${helpers.getLocaleValue({ value: collection?.details.labels.singular, fallback: request.collectionKey })} #${request.documentId}`;

/** The copy for a workflow stage that lets a request reach its target. */
export const getWorkflowAllowedCopy = (
	type: RequestDetails["type"],
	target: string,
): { title: string; description: string } => {
	if (type === "create") {
		return {
			title: T()("requests.checks.workflow.create.allowed.title"),
			description: T()("requests.checks.workflow.create.allowed"),
		};
	}
	if (type === "update") {
		return {
			title: T()("requests.checks.workflow.update.allowed.title"),
			description: T()("requests.checks.workflow.update.allowed"),
		};
	}
	return {
		title: T()("requests.checks.workflow.allowed.title", { target }),
		description: T()("requests.checks.workflow.allowed", { target }),
	};
};

export const getBlockerCopy = (
	blocker: RequestBlocker,
	collection: Collection | undefined,
	type: RequestDetails["type"],
): { title: string; description: string } => {
	const target = blocker.target
		? getTargetLabel(collection, blocker.target)
		: "";
	const required = blocker.required
		? getTargetLabel(collection, blocker.required)
		: "";
	switch (blocker.code) {
		case "collection_unavailable":
			return {
				title: T()("requests.blocker.collection.unavailable.title"),
				description: T()("requests.blocker.collection.unavailable"),
			};
		case "migration_required":
			return {
				title: T()("requests.blocker.migration.required.title"),
				description: T()("requests.blocker.migration.required"),
			};
		case "collection_locked":
			return {
				title: T()("requests.blocker.collection.locked.title"),
				description: T()("requests.blocker.collection.locked"),
			};
		case "document_deleted":
			return {
				title: T()("requests.blocker.document.deleted.title"),
				description: T()("requests.blocker.document.deleted"),
			};
		case "document_permanently_deleted":
			return {
				title: T()("requests.blocker.document.permanently.deleted.title"),
				description: T()("requests.blocker.document.permanently.deleted"),
			};
		case "source_missing":
			return {
				title: T()("requests.blocker.source.missing.title"),
				description: T()("requests.blocker.source.missing"),
			};
		case "no_targets":
			return {
				title: T()("requests.blocker.no.targets.title"),
				description: T()("requests.blocker.no.targets"),
			};
		case "target_unavailable":
			return {
				title: T()("requests.blocker.target.unavailable.title", { target }),
				description: T()("requests.blocker.target.unavailable", { target }),
			};
		case "workflow":
			if (type === "create") {
				return {
					title: T()("requests.blocker.workflow.create.title"),
					description: T()("requests.blocker.workflow.create"),
				};
			}
			if (type === "update") {
				return {
					title: T()("requests.blocker.workflow.update.title"),
					description: T()("requests.blocker.workflow.update"),
				};
			}
			return {
				title: T()("requests.blocker.workflow.title", { target }),
				description: T()("requests.blocker.workflow", { target }),
			};
		case "prerequisite":
			return {
				title: T()("requests.blocker.prerequisite.title", { required }),
				description: T()("requests.blocker.prerequisite", {
					target,
					required,
				}),
			};
		case "acknowledge_required":
			return {
				title: T()("requests.checks.published", { target }),
				description: T()("requests.blocker.acknowledge.required", { target }),
			};
		case "target_changed":
			return {
				title: T()("requests.blocker.target.changed.title", { target }),
				description: T()("requests.blocker.target.changed", { target }),
			};
		case "scheduling_unavailable":
			return {
				title: T()("requests.blocker.scheduling.unavailable.title"),
				description: T()("requests.blocker.scheduling.unavailable"),
			};
		case "comments_open":
			return {
				title: T()("requests.blocker.comments.open.title"),
				description: T()("requests.readiness.comments.open"),
			};
		case "check":
			return {
				title: target
					? T()("requests.blocker.check.target.title", { target })
					: T()("requests.blocker.check.title"),
				description: blocker.message ?? "",
			};
	}
};

/**
 * Optional activity people can show on a request. All are hidden by default,
 * while core events, eg. comments, approvals and completing, always show.
 */
export const requestActivityFilters = [
	{
		key: "documents",
		label: "requests.activity.filter.documents",
		types: ["document_added", "document_removed"],
	},
	{
		key: "targets",
		label: "requests.activity.filter.targets",
		types: ["target_added", "target_removed"],
	},
	{
		key: "acknowledgements",
		label: "requests.activity.filter.acknowledgements",
		types: ["target_acknowledged", "target_unacknowledged"],
	},
	{
		key: "reviewers",
		label: "requests.activity.filter.reviewers",
		types: ["reviewer_added", "reviewer_removed"],
	},
	{
		key: "schedule",
		label: "requests.activity.filter.schedule",
		types: ["schedule_updated"],
	},
	{
		key: "publishes",
		label: "requests.activity.filter.publishes",
		types: ["target_published", "target_unpublished"],
	},
	{
		key: "edits",
		label: "requests.activity.filter.edits",
		types: ["proposal_edited"],
	},
	{
		key: "workflow",
		label: "requests.activity.filter.workflow",
		types: ["workflow_updated"],
	},
] as const satisfies ReadonlyArray<{
	key: string;
	label: string;
	types: ReadonlyArray<RequestEvent["type"]>;
}>;

export type RequestActivityFilter =
	(typeof requestActivityFilters)[number]["key"];
