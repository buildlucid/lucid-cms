import type {
	Collection,
	Release,
	ReleaseBlocker,
	ReleaseDocument,
	ReleaseEvent,
	ReleaseSummary,
	ReleaseTarget,
} from "@types";
import type { PillVariant } from "@/components/Pill/Pill";
import type { StatusIndicatorVariant } from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";
import helpers from "@/utils/helpers";

/** Filtered release lists that dashboards and overviews link to. */
export const releaseListRoutes = {
	pending: "/lucid/releases?filter[status]=open&filter[approval]=pending",
	scheduled:
		"/lucid/releases?filter[status]=open&filter[approval]=approved&filter[scheduled]=1",
	failed: "/lucid/releases?filter[status]=open&filter[failed]=1",
};

export type ReleaseState =
	| "released"
	| "closed"
	| "failed"
	| "approved"
	| "pending";

/** The one status people see: released, closed, failed, approved or awaiting approval. */
export const getReleaseState = (
	release: Release | ReleaseSummary,
): ReleaseState => {
	if (release.status === "released") return "released";
	if (release.status === "closed") return "closed";
	if (release.failure) return "failed";
	return release.approved ? "approved" : "pending";
};

/** How each release state is labelled and coloured, as a pill or a status dot. */
export const releaseStates: Record<
	ReleaseState,
	{
		label: () => string;
		pill: PillVariant;
		indicator: StatusIndicatorVariant;
	}
> = {
	released: {
		label: () => T()("releases.state.released"),
		pill: "purple-subtle",
		indicator: "purple-subtle",
	},
	closed: {
		label: () => T()("releases.state.closed"),
		pill: "outline",
		indicator: "neutral-subtle",
	},
	failed: {
		label: () => T()("releases.state.failed"),
		pill: "danger-subtle",
		indicator: "danger-subtle",
	},
	approved: {
		label: () => T()("releases.state.approved"),
		pill: "success-subtle",
		indicator: "success-subtle",
	},
	pending: {
		label: () => T()("releases.state.pending"),
		pill: "warning-subtle",
		indicator: "warning-subtle",
	},
};

/**
 * What a release will do to one target, as a short label beside it. Changed destinations require explicit acknowledgement before approval.
 */
export const getTargetStatus = (
	release: Release,
	target: ReleaseTarget,
): {
	label: string;
	tone: "warning" | "default" | "muted" | "success";
} | null => {
	if (release.status === "released") {
		return { label: T()("releases.target.status.released"), tone: "success" };
	}
	if (release.status === "closed") return null;
	if (target.changedSinceCreation) {
		return {
			label: target.reviewed
				? T()("releases.target.status.reviewed")
				: T()("releases.target.status.review.required"),
			tone: target.reviewed ? "success" : "warning",
		};
	}
	if (target.changed) {
		return { label: T()("releases.target.status.changes"), tone: "default" };
	}
	return { label: T()("releases.target.status.none"), tone: "muted" };
};

/** Labels latest, proposals and environments the way editors see them. */
export const getTargetLabel = (
	collection: Collection | undefined,
	target: string,
) => {
	if (target === "latest") return T()("releases.target.latest");
	if (target === "proposal") return T()("releases.target.proposal");

	const environment = collection?.publishing.targets.find(
		(environment) => environment.key === target,
	);
	return (
		helpers.getLocaleValue({ value: environment?.label, fallback: target }) ||
		target
	);
};

/**
 * Lists selectable environments in release order. Environment snapshots move forward.
 */
export const getAllowedTargets = (
	collection: { publishing: { targets: Array<{ key: string }> } } | undefined,
	source: string,
) => {
	const environments = (collection?.publishing.targets ?? []).map(
		(target) => target.key,
	);
	if (source === "latest") return environments;

	const index = environments.indexOf(source);
	return index === -1 ? [] : environments.slice(index + 1);
};

/** The open proposals a document has in each release, with their editable versions. */
export const getDocumentProposals = (
	releases: ReleaseSummary[],
	document: { collectionKey: string; documentId: number | undefined },
) =>
	releases.flatMap((release) => {
		const member = release.documents.find(
			(member) =>
				member.collectionKey === document.collectionKey &&
				member.documentId === document.documentId,
		);
		return member?.source === "latest" && member.versionId !== null
			? [{ release, document: member, versionId: member.versionId }]
			: [];
	});

export const getReleaseDocumentLabel = (
	release: Pick<
		ReleaseDocument,
		"collectionKey" | "documentId" | "documentLabel"
	>,
	collection: Collection | undefined,
) =>
	release.documentLabel ||
	`${helpers.getLocaleValue({ value: collection?.details.labels.singular, fallback: release.collectionKey })} #${release.documentId}`;

/** A blocker's short title and the sentence explaining it. */
export const getBlockerCopy = (
	blocker: ReleaseBlocker,
	collection: Collection | undefined,
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
				title: T()("releases.blocker.collection.unavailable.title"),
				description: T()("releases.blocker.collection.unavailable"),
			};
		case "migration_required":
			return {
				title: T()("releases.blocker.migration.required.title"),
				description: T()("releases.blocker.migration.required"),
			};
		case "collection_locked":
			return {
				title: T()("releases.blocker.collection.locked.title"),
				description: T()("releases.blocker.collection.locked"),
			};
		case "document_deleted":
			return {
				title: T()("releases.blocker.document.deleted.title"),
				description: T()("releases.blocker.document.deleted"),
			};
		case "source_missing":
			return {
				title: T()("releases.blocker.source.missing.title"),
				description: T()("releases.blocker.source.missing"),
			};
		case "no_targets":
			return {
				title: T()("releases.blocker.no.targets.title"),
				description: T()("releases.blocker.no.targets"),
			};
		case "target_unavailable":
			return {
				title: T()("releases.blocker.target.unavailable.title", { target }),
				description: T()("releases.blocker.target.unavailable", { target }),
			};
		case "workflow":
			return {
				title: T()("releases.blocker.workflow.title", { target }),
				description: T()("releases.blocker.workflow", { target }),
			};
		case "prerequisite":
			return {
				title: T()("releases.blocker.prerequisite.title", { required }),
				description: T()("releases.blocker.prerequisite", {
					target,
					required,
				}),
			};
		case "review_required":
			return {
				title: T()("releases.checks.published", { target }),
				description: T()("releases.blocker.review.required", { target }),
			};
		case "target_changed":
			return {
				title: T()("releases.blocker.target.changed.title", { target }),
				description: T()("releases.blocker.target.changed", { target }),
			};
		case "scheduling_unavailable":
			return {
				title: T()("releases.blocker.scheduling.unavailable.title"),
				description: T()("releases.blocker.scheduling.unavailable"),
			};
	}
};

/**
 * Optional activity people can show on a release. All are hidden by default,
 * while core events, eg. comments, approvals and releasing, always show.
 */
export const releaseActivityFilters = [
	{
		key: "documents",
		label: "releases.activity.filter.documents",
		types: ["document_added", "document_removed"],
	},
	{
		key: "targets",
		label: "releases.activity.filter.targets",
		types: ["target_added", "target_removed"],
	},
	{
		key: "reviews",
		label: "releases.activity.filter.reviews",
		types: ["target_reviewed", "target_unreviewed"],
	},
	{
		key: "reviewers",
		label: "releases.activity.filter.reviewers",
		types: ["reviewer_added", "reviewer_removed"],
	},
	{
		key: "schedule",
		label: "releases.activity.filter.schedule",
		types: ["schedule_updated"],
	},
	{
		key: "publishes",
		label: "releases.activity.filter.publishes",
		types: ["target_published"],
	},
	{
		key: "edits",
		label: "releases.activity.filter.edits",
		types: ["proposal_edited"],
	},
	{
		key: "workflow",
		label: "releases.activity.filter.workflow",
		types: ["workflow_updated"],
	},
] as const satisfies ReadonlyArray<{
	key: string;
	label: string;
	types: ReadonlyArray<ReleaseEvent["type"]>;
}>;

export type ReleaseActivityFilter =
	(typeof releaseActivityFilters)[number]["key"];
