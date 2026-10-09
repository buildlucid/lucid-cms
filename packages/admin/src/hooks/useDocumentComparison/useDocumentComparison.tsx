import { useNavigate, useSearchParams } from "@solidjs/router";
import type { InternalCollectionDocument, Refs, ResponseBody } from "@types";
import {
	type Accessor,
	batch,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import { createBrickStore } from "@/store/brickStore/brickStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { formatRelationFilterValue } from "@/utils/document-filter-fields";
import helpers from "@/utils/helpers";
import { getDocumentProposals } from "@/utils/requests";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";
import type { UseDocumentState } from "../useDocumentState/useDocumentState";

export type ComparisonOption = {
	/** latest, an environment key or proposal:{requestId}. */
	key: string;
	label: string;
	versionId: number | null;
	/** Latest and proposals open on the left, environments on the right. */
	editable: boolean;
	/** Where an editable option is edited. */
	location?: string;
};

/** Side-by-side columns only fit on wide screens, matching the `xl` breakpoint. */
const WIDE_QUERY = "(min-width: 1280px)";

/**
 * The view people picked from the view selector while comparing, per document.
 * Kept in memory so closing the comparison returns them to it.
 */
const rememberedViews = new Map<string, string>();

/**
 * Side-by-side state for the page builder. The selected right column version
 * lives in the `compare` search param so it survives moving between editable
 * versions. The displayed right document stays pinned while its current
 * version is queried, so a change elsewhere shows a notice instead of
 * swapping content under the reader.
 */
export const useDocumentComparison = (props: {
	state: UseDocumentState;
	available: Accessor<boolean>;
	/** The side-by-side key of the editable document on the left. */
	currentKey: Accessor<string | undefined>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [search, setSearch] = useSearchParams();
	const rightStore = createBrickStore("comparison-");
	const [pinned, setPinned] =
		createSignal<ResponseBody<InternalCollectionDocument, Refs>>();
	const [pinnedKey, setPinnedKey] = createSignal<string>();
	const [wide, setWide] = createSignal(
		typeof window === "undefined" || window.matchMedia(WIDE_QUERY).matches,
	);

	// ----------------------------------------
	// Queries
	const proposals = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				document: () => {
					const id = props.state.documentId();
					if (id === undefined) return undefined;
					return formatRelationFilterValue({
						collectionKey: props.state.collectionKey(),
						id,
					});
				},
			},
			perPage: 100,
		},
		enabled: () =>
			props.available() &&
			props.state.documentId() !== undefined &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all,
	});

	// ----------------------------------------
	// Memos
	const available = createMemo(() => props.available() && wide());
	const documentKey = createMemo(
		() => `${props.state.collectionKey()}:${props.state.documentId()}`,
	);
	const options = createMemo<ComparisonOption[]>(() => {
		const document = props.state.document();
		if (!document) return [];

		const options: ComparisonOption[] = [
			{
				key: "latest",
				label: T()("common.status.latest"),
				versionId: document.versions.latest?.id ?? null,
				editable: true,
				location: getDocumentRoute("edit", {
					collectionKey: props.state.collectionKey(),
					documentId: document.id,
				}),
			},
		];
		for (const target of props.state.collection()?.publishing.targets ?? []) {
			options.push({
				key: target.key,
				label: helpers.getLocaleValue({
					value: target.label,
					fallback: target.key,
				}),
				versionId: document.versions[target.key]?.id ?? null,
				editable: false,
			});
		}
		for (const proposal of getDocumentProposals(proposals.data?.data ?? [], {
			collectionKey: props.state.collectionKey(),
			documentId: props.state.documentId(),
		})) {
			options.push({
				key: `proposal:${proposal.request.id}`,
				label: T()("requests.proposal.option", {
					request: proposal.request.title,
				}),
				versionId: proposal.versionId,
				editable: true,
				location: getRequestRoute({
					requestId: proposal.request.id,
					content: proposal.document,
				}),
			});
		}
		return options;
	});
	const selectedKey = createMemo(() =>
		typeof search.compare === "string" &&
		available() &&
		search.compare !== props.currentKey()
			? search.compare
			: undefined,
	);
	const selected = createMemo(() =>
		options().find((option) => option.key === selectedKey()),
	);
	const selectionId = createMemo(() => `${documentKey()}:${selectedKey()}`);
	const query = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: props.state.collectionKey,
				id: props.state.documentId,
				version: () =>
					selected()?.key.startsWith("proposal:")
						? (selected()?.versionId ?? undefined)
						: selected()?.key,
			},
			include: { bricks: true, refs: true },
		},
		enabled: () =>
			selected()?.versionId !== null && selected()?.versionId !== undefined,
		refetchOnWindowFocus: true,
	});
	//* only the selection on screen, never one pinned for a previous selection
	const displayed = createMemo(() =>
		pinnedKey() === selectionId() ? pinned() : undefined,
	);
	//* a newer publish or edit of the version on screen. The document's own
	//* updatedAt isn't used, as saving any of its versions changes it
	const changed = createMemo(() => {
		const current = query.data?.data;
		const displayedDocument = displayed()?.data;
		if (!displayedDocument) return false;
		if (query.isError) return true;
		if (!current) return false;

		return (
			current.versionId !== displayedDocument.versionId ||
			current.contentId !== displayedDocument.contentId
		);
	});

	// ----------------------------------------
	// Functions
	const select = (key: string | undefined) => {
		batch(() => {
			setPinned(undefined);
			setPinnedKey(undefined);
		});
		setSearch({ compare: key }, { replace: true });
	};
	/** Opens with the first other version that has content. */
	const openFirst = () => {
		const first = options().find(
			(option) =>
				option.versionId !== null && option.key !== props.currentKey(),
		);
		if (first) select(first.key);
	};
	/** Closes the comparison, returning to a view picked while comparing. */
	const close = () => {
		const remembered = rememberedViews.get(documentKey());
		rememberedViews.delete(documentKey());
		if (remembered) {
			navigate(remembered);
			return;
		}
		select(undefined);
	};
	const toggle = () => {
		if (selected()) {
			close();
			return;
		}
		openFirst();
	};
	const rememberView = (location: string | undefined) => {
		if (location) {
			rememberedViews.set(documentKey(), location);
			return;
		}
		rememberedViews.delete(documentKey());
	};
	const refresh = async () => {
		const response = await query.refetch();
		if (response.data && !response.isError) {
			setPinned(response.data);
			setPinnedKey(selectionId());
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (typeof window === "undefined") return;

		const media = window.matchMedia(WIDE_QUERY);
		const update = () => setWide(media.matches);
		media.addEventListener("change", update);
		onCleanup(() => media.removeEventListener("change", update));
	});
	//* narrow screens can't fit two columns, so the comparison closes instead of stacking
	createEffect(
		on(wide, (isWide) => {
			if (!isWide && typeof search.compare === "string") select(undefined);
		}),
	);
	//* pins only data fetched since this selection opened, never a stale cached copy
	createEffect(() => {
		const key = selectedKey();
		const versionId = selected()?.versionId;
		const response = query.data;
		if (!key) {
			batch(() => {
				setPinned(undefined);
				setPinnedKey(undefined);
			});
			return;
		}
		if (!query.isFetchedAfterMount || query.isFetching) return;
		if (!response || response.data.id !== props.state.documentId()) return;
		if (
			key.startsWith("proposal:")
				? response.data.versionId !== versionId
				: response.data.version !== key
		) {
			return;
		}
		if (pinnedKey() !== selectionId()) {
			batch(() => {
				setPinned(response);
				setPinnedKey(selectionId());
			});
		}
	});
	createEffect(() => {
		const response = displayed();
		if (!response) return;

		rightStore.set(
			"collectionLocalized",
			props.state.collection()?.localized !== false,
		);
		rightStore.get.setBricks(response.data, props.state.collection());
		rightStore.get.setRefs(response.refs);
		rightStore.set("locked", true);
		rightStore.set("autoSavePaused", true);
	});
	//* publication IDs can also arrive through a background update of the left document
	createEffect(
		on(
			() => selected()?.versionId,
			() => {
				if (displayed()) void query.refetch();
			},
			{ defer: true },
		),
	);

	return {
		available,
		options,
		selected,
		selectedKey,
		open: () => selected() !== undefined,
		select,
		toggle,
		close,
		rememberView,
		query,
		pinned: displayed,
		rightStore,
		changed,
		refresh,
	};
};

export type UseDocumentComparison = ReturnType<typeof useDocumentComparison>;
