import type {
	Collection,
	RequestBlocker,
	RequestDetail,
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

/**
 * The open requests people act on, in the order dashboards show them. Each
 * queue is also a Requests page preset, and counts add up every request type.
 */
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
	`/lucid/requests?${Object.entries(queue.filters)
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
	request: RequestDetail | RequestSummary,
): RequestState => {
	if (request.status === "completed") return "completed";
	if (request.status === "closed") return "closed";
	if (request.failure) return "failed";
	return request.approved ? "approved" : "pending";
};

/** Whether the signed in user has approved the request's current revision. */
export const hasApproved = (request: RequestDetail) =>
	request.approvals.some(
		(approval) => approval.user?.id === userStore.get.user?.id,
	);

/**
 * How many approvals the request would have once the user approves. An
 * earlier approval counts once, and can approve the request on its own once
 * its collections need fewer.
 */
export const getApprovalsAfter = (request: RequestDetail) =>
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

/**
 * What a request will do to one target, as a short label beside it. Changed destinations require explicit acknowledgement before approval.
 */
export const getTargetStatus = (
	request: RequestDetail,
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
			label: target.reviewed
				? T()("requests.target.status.reviewed")
				: T()("requests.target.status.review.required"),
			tone: target.reviewed ? "success" : "warning",
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

	const environment = collection?.publishing.targets.find(
		(environment) => environment.key === target,
	);
	return (
		helpers.getLocaleValue({ value: environment?.label, fallback: target }) ||
		target
	);
};

/** Lists a source's publish destinations in request order, returning none when the request has no source. */
export const getAllowedTargets = (
	collection: { publishing: { targets: Array<{ key: string }> } } | undefined,
	source: string | null,
) => {
	if (source === null) return [];

	const environments = (collection?.publishing.targets ?? []).map(
		(target) => target.key,
	);
	if (source === "latest") return ["latest", ...environments];

	const index = environments.indexOf(source);
	return index === -1 ? [] : environments.slice(index + 1);
};

/** New requests start on the first environment they can move to, as latest is opt in. */
export const getDefaultTargets = (
	collection: { publishing: { targets: Array<{ key: string }> } } | undefined,
	source: string,
) =>
	getAllowedTargets(collection, source)
		.filter((target) => target !== "latest")
		.slice(0, 1);

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
		userStore.get.hasPermission([Permissions.RequestsRead]).all &&
		userStore.get.hasPermission([
			collection.permissions.create,
			collection.permissions["create-request"],
		]).some;

	return [
		...(canCreate ? (["create"] as const) : []),
		...(canRequest ? (["request"] as const) : []),
	];
};

/** The open proposals a document has in each request, with their editable versions. */
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
		return member?.source === "latest" && member.versionId !== null
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

export const getBlockerCopy = (
	blocker: RequestBlocker,
	collection: Collection | undefined,
	type: RequestDetail["type"],
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
		case "review_required":
			return {
				title: T()("requests.checks.published", { target }),
				description: T()("requests.blocker.review.required", { target }),
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
		key: "reviews",
		label: "requests.activity.filter.reviews",
		types: ["target_reviewed", "target_unreviewed"],
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
