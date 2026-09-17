import { useNavigate, useParams } from "@solidjs/router";
import type { DocumentVersion, UserRef } from "@types";
import { createEffect, createMemo, createSignal } from "solid-js";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";
import { isInaccessibleError } from "@/utils/error-handling";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import useQueryState, {
	pagination,
	sort,
} from "../useQueryState/useQueryState";
import type { RetentionInfo, TimelineGroup, TimelineItem } from "./types";
import { buildTimeline } from "./utils/build-timeline";
import { getDateGroupKey } from "./utils/date-group";

const PER_PAGE = 20;

export function useDocumentHistoryState() {
	const params = useParams();
	const navigate = useNavigate();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: PER_PAGE }),
		},
		singleSort: true,
	});

	const [accumulatedRevisions, setAccumulatedRevisions] = createSignal<
		DocumentVersion[]
	>([]);
	const [revisionName, setRevisionName] = createSignal("");
	const [selectedItem, setSelectedItem] = createSignal<TimelineItem | null>(
		null,
	);
	const [restoreRevisionOpen, setRestoreRevisionOpen] = createSignal(false);

	// ------------------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey || "");
	const documentId = createMemo(() =>
		params.documentId ? Number.parseInt(params.documentId, 10) : undefined,
	);
	const canFetchRevisions = createMemo(() => {
		return documentId() !== undefined && searchParams.ready();
	});
	const selectedVersion = createMemo(() => {
		const item = selectedItem();
		if (!item) return undefined;
		if (item.type === "latest") return "latest";
		if (item.type === "revision") return item.id;
		if (item.type === "snapshot") return item.id;
		if (item.type === "environment") return item.version;
		return undefined;
	});
	const selectedReleaseTarget = createMemo(() => {
		const item = selectedItem();
		return item?.type === "environment" ? item.version : undefined;
	});
	// ------------------------------------------
	// Queries
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});
	const revisionsQuery = api.documents.useGetMultipleRevisions({
		queryParams: {
			queryString: searchParams.queryString,
			location: {
				collectionKey: collectionKey,
				documentId: documentId,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});
	const documentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: "latest",
			},
			include: {
				bricks: false,
				"refs.users": true,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});
	const selectedVersionDocumentQuery = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: selectedVersion,
			},
			include: {
				bricks: true,
				refs: true,
			},
		},
		enabled: () => canFetchRevisions() && selectedVersion() !== undefined,
		refetchOnWindowFocus: false,
	});
	const releaseOperationsQuery = api.publishOperations.useGetMultiple({
		queryParams: {
			filters: {
				collectionKey: collectionKey,
				documentId: documentId,
				target: selectedReleaseTarget,
				status: () => ["pending", "approved"],
				executionStatus: () => ["awaiting_approval", "scheduled", "executing"],
			},
			perPage: 6,
		},
		enabled: () =>
			canFetchRevisions() &&
			selectedReleaseTarget() !== undefined &&
			collectionQuery.data?.data !== undefined &&
			userStore.get.hasPermission([
				Permissions.PublishOperationsRead,
				collectionQuery.data.data.permissions.review,
			]).all,
	});

	// ------------------------------------------
	// Memos
	const collection = createMemo(() => collectionQuery.data?.data);
	const isLoading = createMemo(() => {
		return (
			collectionQuery.isLoading ||
			revisionsQuery.isLoading ||
			documentQuery.isLoading
		);
	});
	const isSuccess = createMemo(() => {
		return (
			collectionQuery.isSuccess &&
			revisionsQuery.isSuccess &&
			documentQuery.isSuccess
		);
	});
	const isError = createMemo(
		() =>
			collectionQuery.isError ||
			revisionsQuery.isError ||
			documentQuery.isError,
	);
	const isEmpty = createMemo(
		() => isSuccess() && accumulatedRevisions().length === 0,
	);
	const meta = createMemo(() => revisionsQuery.data?.meta);
	const hasMore = createMemo(() => {
		const m = meta();
		if (!m || m.currentPage === null || m.lastPage === null) return false;
		return m.currentPage < m.lastPage;
	});
	const collectionName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection()?.details.labels.plural,
			}) || T()("common.collection"),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection()?.details.labels.singular,
			}) || T()("common.collection"),
	);
	const groupedRevisions = createMemo(() => {
		const revisions = accumulatedRevisions();
		const groups: Map<string, DocumentVersion[]> = new Map();

		for (const revision of revisions) {
			const dateKey = getDateGroupKey(revision.createdAt);
			const existing = groups.get(dateKey) || [];
			groups.set(dateKey, [...existing, revision]);
		}

		return Array.from(groups.entries()).map(([dateLabel, items]) => ({
			dateLabel,
			revisions: items,
		}));
	});
	const document = createMemo(() => documentQuery.data?.data);
	const collectionAccessError = createMemo(
		() => collectionQuery.isError && isInaccessibleError(collectionQuery.error),
	);
	const documentAccessError = createMemo(
		() => documentQuery.isError && isInaccessibleError(documentQuery.error),
	);

	const timelineData = createMemo((): TimelineGroup[] => {
		const documentData = document();
		const revisions = accumulatedRevisions();
		return buildTimeline({ documentData, revisions });
	});
	const selectedCreatedByUser = createMemo(() => {
		return findDocumentUserRef(
			selectedVersionDocumentQuery.data?.refs,
			selectedItem()?.createdBy,
		) satisfies UserRef | undefined;
	});
	const selectedRetention = createMemo((): RetentionInfo => {
		const item = selectedItem();
		const revisions = collection()?.revisions;
		const retentionDays = revisions?.enabled ? revisions.retentionDays : false;

		if (item?.type !== "revision") {
			return {
				state: "protected",
				label: T()("documents.revisions.retention.current.version.title"),
				description: T()(
					"documents.revisions.retention.current.version.description",
				),
			};
		}

		const referencedBy = Object.entries(document()?.versions ?? {})
			.filter(
				([key, version]) =>
					key !== "revision" && version?.promotedFrom === item.id,
			)
			.map(([key]) => key);

		if (referencedBy.length > 0) {
			return {
				state: "protected",
				label: T()("documents.revisions.retention.protected.title"),
				description: T()(
					"documents.revisions.retention.protected.description",
					{
						versions: referencedBy.join(", "),
					},
				),
			};
		}

		if (retentionDays === false) {
			return {
				state: "retained",
				label: T()("documents.revisions.retention.indefinite.title"),
				description: T()(
					"documents.revisions.retention.indefinite.description",
				),
			};
		}

		if (retentionDays === undefined || !item.createdAt) {
			return {
				state: "unknown",
				label: T()("documents.revisions.retention.unknown.title"),
				description: T()("documents.revisions.retention.unknown.description"),
			};
		}

		const expiresAt = new Date(item.createdAt);
		expiresAt.setDate(expiresAt.getDate() + retentionDays);

		const millisecondsRemaining = expiresAt.getTime() - Date.now();
		const daysRemaining = Math.ceil(
			millisecondsRemaining / (1000 * 60 * 60 * 24),
		);

		if (daysRemaining <= 0) {
			return {
				state: "expired",
				label: T()("documents.revisions.retention.cleanup.eligible.title"),
				description: T()(
					"documents.revisions.retention.cleanup.eligible.description",
				),
				expiresAt: expiresAt.toISOString(),
				daysRemaining,
			};
		}

		if (daysRemaining <= 7) {
			return {
				state: "expiring",
				label: T()("documents.revisions.retention.expiring.title"),
				description: T()("documents.revisions.retention.expiring.description", {
					count: daysRemaining,
				}),
				expiresAt: expiresAt.toISOString(),
				daysRemaining,
			};
		}

		return {
			state: "retained",
			label: T()("documents.revisions.retention.retained.title"),
			description: T()("documents.revisions.retention.retained.description", {
				count: daysRemaining,
			}),
			expiresAt: expiresAt.toISOString(),
			daysRemaining,
		};
	});
	const canRestoreSelectedItem = createMemo(() => {
		const permission = collection()?.permissions.restore;
		const item = selectedItem();
		if (!permission || !item) return false;
		if (item.type !== "revision") return false;
		if (document()?.isDeleted) return false;
		return userStore.get.hasPermission([permission]).all;
	});
	const restoreRevision = api.documents.useRestoreRevision({
		getCollectionName: collectionSingularName,
		onSuccess: () => {
			setRestoreRevisionOpen(false);
			setSelectedItem(null);
			void documentQuery.refetch();
			void revisionsQuery.refetch();
		},
	});

	const isItemSelected = (item: TimelineItem): boolean => {
		const selected = selectedItem();
		if (!selected) return false;
		return selected.id === item.id && selected.type === item.type;
	};

	createEffect(() => {
		const data = timelineData();
		if (data.length > 0 && data[0].items.length > 0 && !selectedItem()) {
			setSelectedItem(data[0].items[0]);
		}
	});

	// ------------------------------------------
	// Effects
	createEffect(() => {
		const data = revisionsQuery.data?.data;
		const currentPage = searchParams.pagination().page;

		if (data) {
			if (currentPage === 1) {
				setAccumulatedRevisions(data);
			} else {
				setAccumulatedRevisions((prev) => {
					const existingIds = new Set(prev.map((r) => r.id));
					const newRevisions = data.filter((r) => !existingIds.has(r.id));
					return [...prev, ...newRevisions];
				});
			}
		}
	});

	// ------------------------------------------
	// Handlers
	const loadMore = () => {
		if (hasMore() && !isLoading()) {
			const currentPage = searchParams.pagination().page;
			searchParams.setParams({
				pagination: {
					page: currentPage + 1,
					perPage: PER_PAGE,
				},
			});
		}
	};
	const handleSelectItem = (item: TimelineItem) => {
		setSelectedItem(item);
		setRevisionName("");
	};
	const handleRestoreRevision = () => {
		if (!canRestoreSelectedItem()) return;
		setRestoreRevisionOpen(true);
	};
	const confirmRestoreRevision = async (versionId: number) => {
		const id = documentId();
		if (!id) return;

		await restoreRevision.action.mutateAsync({
			collectionKey: collectionKey(),
			id,
			versionId,
		});
		navigate(
			getDocumentRoute("edit", {
				collectionKey: collectionKey(),
				documentId: id,
				version: "latest",
			}),
		);
	};
	const cancelRestoreRevision = () => {
		setRestoreRevisionOpen(false);
		restoreRevision.reset();
	};

	// ------------------------------------------
	// Return
	return {
		collectionQuery,
		revisionsQuery,
		selectedVersionDocumentQuery,
		releaseOperationsQuery,
		collection,
		document,
		documentQuery,
		collectionAccessError,
		documentAccessError,
		selectedVersionDocument: () => selectedVersionDocumentQuery.data?.data,
		collectionKey,
		documentId,
		searchParams,
		isLoading,
		isSuccess,
		isError,
		isEmpty,
		collectionName,
		collectionSingularName,
		accumulatedRevisions,
		groupedRevisions,
		hasMore,
		loadMore,
		meta,
		revisionName,
		selectedItem,
		selectedCreatedByUser,
		selectedRetention,
		canRestoreSelectedItem,
		handleSelectItem,
		handleRestoreRevision,
		confirmRestoreRevision,
		cancelRestoreRevision,
		restoreRevisionOpen,
		setRestoreRevisionOpen,
		restoreRevision,
		isItemSelected,
		timelineData,
		setRevisionName,
	};
}

export type UseDocumentHistoryState = ReturnType<
	typeof useDocumentHistoryState
>;

export type {
	RetentionInfo,
	TimelineCardType,
	TimelineGroup,
	TimelineItem,
} from "./types";
