import { useNavigate, useParams } from "@solidjs/router";
import type { RequestDetails, RequestDocument } from "@types";
import classnames from "classnames";
import type { Accessor } from "solid-js";
import {
	batch,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	on,
	onCleanup,
	Show,
	Switch,
} from "solid-js";
import Alert from "@/components/Alert/Alert";
import AlignDocumentModal, {
	type AlignmentSource,
} from "@/components/AlignDocumentModal/AlignDocumentModal";
import { BuilderBricks } from "@/components/BuilderBricks/BuilderBricks";
import Button from "@/components/Button/Button";
import { CollectionPseudoBrick } from "@/components/CollectionPseudoBrick/CollectionPseudoBrick";
import DocumentComparisonBar from "@/components/DocumentComparison/DocumentComparisonBar";
import ReadOnlyDocument from "@/components/DocumentComparison/ReadOnlyDocument";
import { DocumentPreview } from "@/components/DocumentPreview/DocumentPreview";
import { DocumentSidebar } from "@/components/DocumentSidebar/DocumentSidebar";
import { FixedBricks } from "@/components/FixedBricks/FixedBricks";
import {
	type BuilderView,
	PageBuilderHeader,
} from "@/components/PageBuilderHeader/PageBuilderHeader";
import type { ViewSelectorOption } from "@/components/PageBuilderHeader/parts/ViewSelector";
import { PageLayoutCorners } from "@/components/PageLayout/parts/PageLayoutCorners";
import Skeleton from "@/components/Skeleton/Skeleton";
import WorkflowStageSelect from "@/components/WorkflowStageSelect/WorkflowStageSelect";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { useBuilderEdits } from "@/hooks/useBuilderEdits/useBuilderEdits";
import { useBuilderSideBySide } from "@/hooks/useBuilderSideBySide/useBuilderSideBySide";
import { useBuilderSplit } from "@/hooks/useBuilderSplit/useBuilderSplit";
import { useBuilderTools } from "@/hooks/useBuilderTools/useBuilderTools";
import { useDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import {
	type ComparisonOption,
	useDocumentComparison,
} from "@/hooks/useDocumentComparison/useDocumentComparison";
import { useDocumentEditors } from "@/hooks/useDocumentEditors/useDocumentEditors";
import { useDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import { useDocumentPreview } from "@/hooks/useDocumentPreview/useDocumentPreview";
import { useDocumentState } from "@/hooks/useDocumentState/useDocumentState";
import { useDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import { useNavigationGuard } from "@/hooks/useNavigationGuard/useNavigationGuard";
import { PageBuilderStateProvider } from "@/hooks/usePageBuilderState/usePageBuilderState";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import { usePreviewAgent } from "@/hooks/usePreviewAgent/usePreviewAgent";
import { usePreviewFieldEdit } from "@/hooks/usePreviewFieldEdit/usePreviewFieldEdit";
import { usePreviewFocus } from "@/hooks/usePreviewFocus/usePreviewFocus";
import { usePreviewStructure } from "@/hooks/usePreviewStructure/usePreviewStructure";
import { useStoredVersionRedirect } from "@/hooks/useStoredVersionRedirect/useStoredVersionRedirect";
import type { PreviewScrollState } from "@/preview/protocol";
import brickStore from "@/store/brickStore/brickStore";
import navigationStore from "@/store/navigationStore/navigationStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getPreviewEditingDetails } from "@/utils/preview-editing";
import { getPreviewErrors } from "@/utils/preview-errors";
import { getRequestRoute } from "@/utils/route-helpers";
import BuilderSplitHandle from "./parts/BuilderSplitHandle";
import DetailsColumn from "./parts/DetailsColumn";
import DocumentChangedBar from "./parts/DocumentChangedBar";
import DocumentEditorSkeleton, {
	type DocumentEditorSkeletonLayout,
} from "./parts/DocumentEditorSkeleton";
import DocumentHeldModal from "./parts/DocumentHeldModal";
import { PageBuilderModals } from "./parts/PageBuilderModals";

const DocumentEditorPage: Component<{
	mode: "create" | "edit";
	version?: "latest" | "revision" | "snapshot" | "proposal";
	versionId?: Accessor<number | undefined>;
	/** Set when editing a request proposal, which keeps the editor inside its request. */
	request?: Accessor<RequestDetails | undefined>;
	requestDocument?: Accessor<RequestDocument | undefined>;
}> = (props) => {
	// ----------------------------------
	// Hooks & State
	const params = useParams();
	const navigate = useNavigate();
	const [getStateLoading, setStateLoading] = createSignal(true);
	const versionType = createMemo(
		() => props.version || params.versionType || "latest",
	);
	const routeVersionId = createMemo(() =>
		params.versionId ? Number.parseInt(params.versionId, 10) : undefined,
	);
	const versionId = createMemo(() => props.versionId?.() ?? routeVersionId());
	let snapshotTimeout: ReturnType<typeof setTimeout> | undefined;
	//* the document and version the builder's content was loaded for, which the router can move on from before it reloads
	const [hydratedViewKey, setHydratedViewKey] = createSignal<string | null>(
		null,
	);
	let capturePreviewScroll:
		| (() => Promise<PreviewScrollState | null>)
		| undefined;
	let pendingPreviewScroll: PreviewScrollState | null = null;
	//* set from the editors below, which need the UI state to know whether this tab can hold the document
	const [heldElsewhere, setHeldElsewhere] = createSignal(false);
	const [previewToolbar, setPreviewToolbar] = createSignal<HTMLDivElement>();
	const agentSession = useAgentSession();
	const sideBySide = useBuilderSideBySide();
	const split = useBuilderSplit();

	const docState = useDocumentState({
		mode: props.mode,
		version: versionType,
		versionId: versionId,
	});
	const redirecting = useStoredVersionRedirect({
		enabled: () => props.mode === "edit" && props.request === undefined,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		versionType,
		versionId,
	});

	const mutations = useDocumentMutations({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		collectionSingularName: docState.collectionSingularName,
		version: versionType,
		mode: props.mode,
		document: docState.document,
		versionId: versionId,
		//* the server refused a save as another tab took over, which the next heartbeat would only show later
		onHeld: () => editors.refresh(),
	});

	//* which document and version the route shows, to tell when the builder's content belongs to another
	const getViewKey = (): string | null => {
		if (props.mode === "create") {
			return `create:${docState.collectionKey()}`;
		}

		const routeDocumentId = docState.documentId();
		if (routeDocumentId === undefined) return null;

		const routeVersionKey =
			versionType() === "revision"
				? `revision:${versionId() ?? "unknown"}`
				: versionType() === "snapshot" || versionType() === "proposal"
					? `${versionType()}:${versionId() ?? "unknown"}`
					: `status:${versionType()}`;

		return `${docState.collectionKey()}:${routeDocumentId}:${routeVersionKey}`;
	};

	const uiState = useDocumentUIState({
		collectionQuery: docState.collectionQuery,
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		document: docState.document,
		documentQuery: docState.documentQuery,
		mode: props.mode,
		version: versionType,
		versionId: versionId,
		createDocumentMutation: mutations.createDocumentMutation,
		requestDocumentMutation: mutations.requestDocumentMutation,
		createSingleVersionMutation: mutations.createSingleVersionMutation,
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		publishMutation: mutations.publishMutation,
		proposalEditable: () =>
			props.request?.()?.status === "open" &&
			props.requestDocument?.()?.permissions.edit === true,
		heldElsewhere,
	});
	//* one tab at a time edits a document, so the agent's other tools can't replace unsaved changes either
	const editors = useDocumentEditors({
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		requestId: () => props.request?.()?.id ?? null,
		enabled: () =>
			props.mode === "edit" &&
			docState.document() !== undefined &&
			!uiState.isDocumentLocked() &&
			uiState.hasSavePermission(),
	});
	createEffect(() => setHeldElsewhere(!editors.holding()));
	const documentLabel = createMemo(() => {
		const document = docState.document();
		if (props.mode === "create" || !document) {
			return T()("actions.create.document", {
				collectionSingle: docState.collectionSingularName(),
			});
		}
		return getDocumentPreviewLabel({
			collection: docState.collection(),
			document,
			contentLocale: docState.contentLocale() ?? "",
		});
	});
	//* the agent works on what this editor shows, unsaved changes included, once the content for this document and version has loaded
	useBuilderTools({
		enabled: () =>
			uiState.isSuccess() &&
			getViewKey() !== null &&
			hydratedViewKey() === getViewKey() &&
			(props.mode === "create" ||
				(docState.document() !== undefined &&
					(versionType() === "latest" || versionType() === "proposal"))),
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		versionId: () => docState.document()?.versionId ?? undefined,
		requestId: () => props.request?.()?.id ?? null,
		label: documentLabel,
		locales: docState.contentLocales,
		editable: () => !uiState.isBuilderLocked(),
	});
	const edits = useBuilderEdits({
		enabled: () => !uiState.isBuilderLocked(),
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		locales: docState.contentLocales,
	});

	const autoSave = useDocumentAutoSave({
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		checkSingleVersionMutation: mutations.checkSingleVersionMutation,
		document: docState.document,
		collection: docState.collection,
		hasDraftSyncPermission: () =>
			uiState.hasSavePermission() && !uiState.isBuilderLocked(),
		autoSaveActive: uiState.isAutoSaveActive,
	});
	//* request snapshots can't change, so only latest and proposals open side by side
	const comparisonAvailable = () =>
		props.mode === "edit" &&
		(versionType() === "latest" || versionType() === "proposal");
	//* the side-by-side key of the editable document on the left
	const comparisonKey = createMemo(() => {
		if (versionType() === "latest") return "latest";
		const request = props.request?.();
		return request && versionType() === "proposal"
			? `proposal:${request.id}`
			: undefined;
	});
	const comparison = useDocumentComparison({
		state: docState,
		available: comparisonAvailable,
		currentKey: comparisonKey,
	});
	const destinationContentId = () => {
		const document = docState.document();
		const metadata = mutations.autoSaveMetadata();
		if (document && metadata?.versionId === document.versionId) {
			return metadata.contentId;
		}
		if (versionType() === "proposal") {
			return props.requestDocument?.()?.contentId ?? undefined;
		}
		return document?.versions[versionType()]?.contentId;
	};
	const preview = useDocumentPreview({
		version: versionType,
		document: docState.document,
		autoSaveMetadata: mutations.autoSaveMetadata,
		locale: docState.contentLocale,
	});
	//* the preview shows unsaved edits only to those who could save them
	const canSyncPreviewDraft = () =>
		uiState.hasSavePermission() && !uiState.isBuilderLocked();
	const previewFocus = usePreviewFocus({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		locales: docState.contentLocales,
		previewBehind: () =>
			!canSyncPreviewDraft() && brickStore.getDocumentContentMutated(),
	});
	const previewStructure = usePreviewStructure({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		locales: docState.contentLocales,
		reveal: (target) => {
			void previewFocus.requestTarget(target);
			previewFocus.pointOut(target);
		},
	});
	const previewEditingDetails = createMemo(() => {
		const collection = docState.collection();
		return collection ? getPreviewEditingDetails(collection) : null;
	});
	const previewFieldEdit = usePreviewFieldEdit({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		locales: docState.contentLocales,
	});
	const previewAgent = usePreviewAgent({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		label: documentLabel,
		details: previewEditingDetails,
	});
	const previewErrors = createMemo(
		() => {
			const collection = docState.collection();
			const brickErrors = brickStore.get.brickErrors;
			const fieldsErrors = brickStore.get.fieldsErrors;
			if (!collection || (!brickErrors.length && !fieldsErrors.length)) {
				return [];
			}
			return getPreviewErrors({
				collection,
				bricks: brickStore.get.bricks,
				brickErrors,
				fieldsErrors,
				locale: preview.locale(),
			});
		},
		[],
		//* item indexes come from the bricks, which change with every edit
		{ equals: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
	);

	const navigationGuard = useNavigationGuard(docState.shouldBlockNavigation);
	const registerPreviewScrollCapture = (
		capture: () => Promise<PreviewScrollState | null>,
	) => {
		capturePreviewScroll = capture;
		return () => {
			if (capturePreviewScroll === capture) capturePreviewScroll = undefined;
		};
	};
	const preparePreviewVersionChange = async () => {
		pendingPreviewScroll = (await capturePreviewScroll?.()) ?? null;
	};
	const consumePreviewScrollRestore = () => {
		const scrollState = pendingPreviewScroll;
		pendingPreviewScroll = null;
		return scrollState;
	};

	// ------------------------------------------
	// Setup document state
	const setDocumentState = () => {
		if (brickStore.get.relationFieldDragCount > 0) return;

		const collection = docState.collection();
		if (!collection) return;

		const document = docState.document();
		if (props.mode === "edit") {
			const routeDocumentId = docState.documentId();
			if (!document || routeDocumentId === undefined) return;
			if (document.id !== routeDocumentId) return;
		}

		const nextViewKey = getViewKey();
		const shouldMerge =
			nextViewKey !== null && hydratedViewKey() === nextViewKey;
		const hasUnsavedChanges =
			brickStore.get.initialSnapshot !== null &&
			brickStore.getDocumentMutated();
		let didHydrateStore = false;

		if (!shouldMerge) {
			setStateLoading(true);
		}

		batch(() => {
			if (!shouldMerge) {
				brickStore.get.reset();
			}

			brickStore.set("collectionLocalized", collection.localized !== false);

			//* preserve local unsaved edits during same-view background query updates
			//* - Without this guard, selecting a relation field can trigger a refetch that rehydrates store fields from stale server data and wipes local changes
			//* - Content saved since, eg. by the agent, waits for the reader to reload or keep their edits
			if (shouldMerge && hasUnsavedChanges) {
				brickStore.set("locked", uiState.isBuilderLocked());
				const saved = document?.contentId ?? null;
				if (brickStore.get.baseContentId === null) {
					brickStore.set("baseContentId", saved);
				} else if (saved !== null && saved !== brickStore.get.baseContentId) {
					brickStore.set("contentChanged", true);
				}
				return;
			}

			if (shouldMerge) {
				//* steps survive this tab's own saves, but not content saved elsewhere, which they weren't made against
				const base = brickStore.get.baseContentId;
				if (base !== null && base !== (document?.contentId ?? null)) {
					brickStore.edits.clear();
				}
				brickStore.get.syncBricks(document, collection);
			} else {
				brickStore.get.setBricks(document, collection);
			}
			brickStore.get.setRefs(docState.refs());
			brickStore.set("locked", uiState.isBuilderLocked());
			brickStore.set("baseContentId", document?.contentId ?? null);
			brickStore.set("contentChanged", false);
			didHydrateStore = true;
		});

		if (snapshotTimeout !== undefined) clearTimeout(snapshotTimeout);
		snapshotTimeout = undefined;

		// Only advance the dirty-state baseline after the store was actually
		// rehydrated from server data. Same-view refetches that are skipped to
		// protect unsaved edits must not mark the current local state as saved.
		if (didHydrateStore) {
			snapshotTimeout = setTimeout(() => {
				brickStore.get.captureInitialSnapshot();
			}, 0);
		}

		setHydratedViewKey(nextViewKey);

		if (!shouldMerge) {
			setStateLoading(false);
			return;
		}
	};

	// ---------------------------------
	// Effects
	usePageTitle(() => {
		if (props.mode === "create") return documentLabel();
		const context = props.request?.()?.title ?? docState.collectionName();
		if (!docState.document()) return context;

		return context ? `${documentLabel()} · ${context}` : documentLabel();
	});

	createEffect(
		on(
			() => [
				docState.collection(),
				docState.document(),
				docState.refs(),
				docState.documentId(),
				versionType(),
				versionId(),
				brickStore.get.relationFieldDragCount,
			],
			() => {
				setDocumentState();
			},
		),
	);

	//* another tab taking hold, or letting go, locks or unlocks the builder straight away
	createEffect(() => brickStore.set("locked", uiState.isBuilderLocked()));
	//* once the person saves or drops the agent's changes, autosave carries on
	createEffect(() => {
		if (brickStore.get.agentEdited && !brickStore.getDocumentMutated()) {
			brickStore.set("agentEdited", false);
		}
	});

	//* the preview takes the sidebar's width, kept while another version loads so the nav doesn't flash in and out
	createEffect(() => {
		if (loading()) return;
		navigationStore.set("tucked", previewing());
	});
	//* opening the agent chat makes room for it by folding the details beside the fields, which can be opened again
	createEffect(
		on(
			agentSession.panel.visible,
			(visible) => {
				if (visible && detailsBeside()) {
					userPreferencesStore.setSectionOpen("pageBuilder.sidebar", false);
				}
			},
			{ defer: true },
		),
	);
	//* what the preview opened stays open once it closes, as it's what's being edited, and the header drops its controls' slot
	createEffect(
		on(
			() => previewing(),
			(open) => {
				if (open) return;
				previewFocus.forgetOpened();
				setPreviewToolbar(undefined);
			},
			{ defer: true },
		),
	);

	onCleanup(() => {
		navigationStore.set("tucked", false);
		if (snapshotTimeout !== undefined) clearTimeout(snapshotTimeout);
		setHydratedViewKey(null);
		capturePreviewScroll = undefined;
		pendingPreviewScroll = null;
		brickStore.get.reset();
		pageBuilderModalsStore.reset();
	});

	//* Redirect out of the document view when the document/collection isn't available.
	createEffect(() => {
		if (docState.collectionAccessError()) {
			navigate("/admin", { replace: true });
			return;
		}
		if (docState.documentAccessError()) {
			if (docState.collection()?.mode === "multiple") {
				navigate(`/admin/collections/${docState.collectionKey()}`, {
					replace: true,
				});
				return;
			}
			navigate("/admin", { replace: true });
		}
	});

	// ---------------------------------
	// Memos
	const [alignOpen, setAlignOpen] = createSignal(false);
	const loading = createMemo(
		() =>
			redirecting() ||
			uiState.isLoading() ||
			getStateLoading() ||
			docState.collectionsQuery.isLoading,
	);
	const disableWorkflow = createMemo(
		() =>
			docState.collection()?.locked === true ||
			docState.document()?.isDeleted === true ||
			uiState.isBuilderLocked(),
	);
	const requestLink = createMemo(() => {
		const request = props.request?.();
		return request ? getRequestRoute({ requestId: request.id }) : undefined;
	});
	const currentViewLabel = createMemo(() => {
		const request = props.request?.();
		if (!request) return undefined;
		return T()(
			versionType() === "proposal"
				? "requests.proposal.selector"
				: "requests.snapshot.selector",
			{ request: request.title },
		);
	});
	//* latest aligns with environments, proposals also with latest
	const alignmentSources = createMemo<AlignmentSource[]>(() => {
		const document = docState.document();
		if (!document) return [];

		const sources: AlignmentSource[] = [];
		if (versionType() === "proposal" && document.versions.latest) {
			sources.push({
				key: "latest",
				label: T()("common.status.latest"),
				contentId: document.versions.latest.contentId,
			});
		}
		for (const environment of docState.collection()?.publishing.environments ??
			[]) {
			const version = document.versions[environment.key];
			if (version) {
				sources.push({
					key: environment.key,
					label: helpers.getLocaleValue({
						value: environment.label,
						fallback: environment.key,
					}),
					contentId: version.contentId,
				});
			}
		}
		return sources;
	});
	const canAlign = createMemo(
		() =>
			(versionType() === "latest" || versionType() === "proposal") &&
			!uiState.isBuilderLocked() &&
			alignmentSources().length > 0,
	);
	const canUpdateWorkflow = createMemo(() => {
		const permission = docState.collection()?.permissions.update;
		return (
			permission !== undefined &&
			!disableWorkflow() &&
			userStore.get.hasPermission([permission]).all
		);
	});
	const relationVersionType = createMemo(() => {
		if (versionType() === "revision" || versionType() === "proposal") {
			return "latest";
		}
		return versionType();
	});
	const collectionFields = createMemo(
		() => docState.collection()?.fields ?? [],
	);
	const fixedBrickConfig = createMemo(
		() => docState.collection()?.fixedBricks ?? [],
	);
	const builderBrickConfig = createMemo(
		() => docState.collection()?.builderBricks ?? [],
	);
	//* the preview and a comparison share the space beside the fields, so the preview waits while comparing
	const previewing = createMemo(
		() => sideBySide() && uiState.getPreviewOpen() && !comparison.open(),
	);
	//* request snapshots show no details, proposals do
	const detailsAvailable = createMemo(
		() => !props.request || versionType() === "proposal",
	);
	//* what the builder will show beside its fields, read from the route and preferences as the document is still loading
	const skeletonLayout = createMemo<DocumentEditorSkeletonLayout>(() => {
		if (!sideBySide()) return "fields";
		if (comparison.selectedKey() !== undefined) return "compare";
		if (
			props.mode === "edit" &&
			docState.collection()?.capabilities.preview !== false &&
			userPreferencesStore.getCollectionPreviewOpen(docState.collectionKey())
		) {
			return "preview";
		}
		return "fields";
	});
	//* the details show while editing: beside the fields where they fit, otherwise below them
	const detailsBeside = createMemo(
		() =>
			detailsAvailable() && sideBySide() && !previewing() && !comparison.open(),
	);
	const detailsBelow = createMemo(() => detailsAvailable() && !sideBySide());
	//* notices take their own room at the end of the fields, so they never cover the last of them
	const showNotices = createMemo(
		() =>
			(!editors.noticeOpen() && editors.holder() !== null) ||
			uiState.collectionNeedsMigrating(),
	);
	const showComparisonToggle = createMemo(
		() =>
			comparison.available() &&
			comparison
				.options()
				.some(
					(option) =>
						option.versionId !== null && option.key !== comparisonKey(),
				),
	);
	const view = createMemo((): BuilderView => {
		if (comparison.open()) return "compare";
		return previewing() ? "preview" : "fields";
	});
	const viewOptions = createMemo(() => {
		const options: Exclude<BuilderView, "fields">[] = [];
		if (uiState.showPreview() && sideBySide()) options.push("preview");
		if (showComparisonToggle()) options.push("compare");
		return options;
	});

	// ----------------------------------
	// Functions
	//* comparing hides the preview without changing whether it's open, so the fields alone close both
	const changeView = (next: BuilderView) => {
		if (next === "compare") {
			if (!comparison.open()) comparison.toggle();
			return;
		}
		if (comparison.open()) comparison.close();
		uiState.setPreviewOpen(next === "preview");
	};
	//* side-by-side stays open when moving between editable versions, and
	//* read-only versions open in its right column instead. The view picked is
	//* remembered so closing the comparison returns to it.
	const resolveVersionChange = async (option: ViewSelectorOption) => {
		const compared = comparison.selectedKey();
		if (compared && option.type === "environment" && option.compareKey) {
			comparison.rememberView(option.location);
			comparison.select(option.compareKey);
			return null;
		}

		await preparePreviewVersionChange();
		if (!compared) return option.location;

		comparison.rememberView(undefined);
		//* comparing against the version being opened swaps the columns
		const keep = option.compareKey === compared ? comparisonKey() : compared;
		if (!keep) return option.location;

		return `${option.location}?compare=${encodeURIComponent(keep)}`;
	};
	/** Leaves a document another tab holds, for the request or list it was opened from. */
	const leave = () => {
		const link = requestLink();
		if (link) {
			navigate(link);
			return;
		}
		navigate(
			docState.collection()?.mode === "multiple"
				? `/admin/collections/${docState.collectionKey()}`
				: "/admin",
		);
	};
	/** Drops unsaved edits for the saved content that changed under them. */
	const reloadChangedContent = async () => {
		autoSave.debouncedAutoSave.clear();
		await docState.documentQuery.refetch();
		//* the edits are dropped, so they stop counting as unsaved and the merge replaces them
		brickStore.get.captureInitialSnapshot();
		setDocumentState();
	};
	/** Keeps unsaved edits, so the next save replaces the content that changed under them. */
	const keepEdits = async () => {
		await docState.documentQuery.refetch();
		brickStore.set("baseContentId", docState.document()?.contentId ?? null);
		brickStore.set("contentChanged", false);
		autoSave.debouncedAutoSave();
	};
	const selectLeftVersion = (option: ComparisonOption) => {
		const compared = comparison.selectedKey();
		if (!option.location || !compared) return;

		comparison.rememberView(undefined);
		//* opening the right column's version on the left swaps the columns
		const keep = option.key === compared ? comparisonKey() : compared;
		navigate(
			keep
				? `${option.location}?compare=${encodeURIComponent(keep)}`
				: option.location,
		);
	};

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={loading()}>
				<DocumentEditorSkeleton
					layout={skeletonLayout()}
					fieldsWidth={split.size()}
					details={
						detailsAvailable() && sideBySide()
							? userPreferencesStore.getSectionOpen("pageBuilder.sidebar") ===
								false
								? "collapsed"
								: "open"
							: undefined
					}
				/>
			</Match>
			<Match when={uiState.isSuccess()}>
				<PageBuilderStateProvider
					mode={props.mode}
					version={versionType}
					versionId={versionId}
					relationVersionType={relationVersionType}
					request={props.request}
					disableWorkflow={disableWorkflow}
					documentState={docState}
					mutations={mutations}
					uiState={uiState}
					autoSave={autoSave}
					navigationGuard={navigationGuard}
				>
					<div class="flex flex-col">
						<PageBuilderHeader
							mode={props.mode}
							version={versionType}
							versionId={versionId}
							currentViewLabel={currentViewLabel}
							view={
								viewOptions().length > 0
									? { value: view, options: viewOptions, onChange: changeView }
									: undefined
							}
							previewBar={
								previewing()
									? { fieldsWidth: split.size, setToolbar: setPreviewToolbar }
									: undefined
							}
							requestLink={requestLink()}
							edits={uiState.isBuilderLocked() ? undefined : edits}
							state={{
								collection: docState.collection,
								collectionKey: docState.collectionKey,
								collectionName: docState.collectionName,
								collectionSingularName: docState.collectionSingularName,
								documentID: docState.documentId,
								document: docState.document,
								autoSaveMetadata: mutations.autoSaveMetadata,
								ui: uiState,
								autoSave: autoSave,
								autoSaveUserEnabled: uiState.autoSaveUserEnabled,
								showRevisionNavigation: uiState.showRevisionNavigation,
								isDocumentMutated: docState.isDocumentMutated,
							}}
							actions={{
								upsertDocumentAction: mutations.upsertDocumentAction,
								publishDocumentAction: mutations.publishDocumentAction,
								restoreRevisionAction: mutations.restoreRevisionAction,
								requestAlignment: canAlign()
									? () => {
											autoSave.debouncedAutoSave.clear();
											setAlignOpen(true);
										}
									: undefined,
								beforeVersionChange: resolveVersionChange,
							}}
						/>
						<div
							data-document-builder
							class={classnames(
								"flex flex-col overflow-clip border-x border-border bg-background",
								previewing()
									? "mb-2 rounded-b-lg md:min-h-[calc(100dvh-3.8125rem)]"
									: "mt-4 rounded-t-xl border-t max-md:mb-4 max-md:rounded-b-xl max-md:border-b md:mb-4 md:min-h-[calc(100dvh-6.375rem)]",
								{ "[--comparison-bar-height:44px]": comparison.open() },
							)}
						>
							<Show when={comparison.open()}>
								<div class="sticky top-(--document-header-bar-height) z-20">
									<DocumentComparisonBar
										comparison={comparison}
										leftKey={comparisonKey()}
										onSelectLeft={selectLeftVersion}
										leftEnd={
											<Show
												when={
													docState.collection()?.publishing.workflow &&
													docState.document()?.workflow
												}
												fallback={
													<span class="text-xs text-muted">
														{uiState.isBuilderLocked()
															? T()("documents.compare.read.only")
															: T()("documents.compare.editing")}
													</span>
												}
											>
												<WorkflowStageSelect
													collection={docState.collection()}
													stage={docState.document()?.workflow?.stage}
													editable={canUpdateWorkflow()}
													loading={
														mutations.updateWorkflowMutation.action.isPending
													}
													onChange={(stage) =>
														void mutations
															.updateWorkflowAction({ stage })
															.catch(() => undefined)
													}
												/>
											</Show>
										}
									/>
								</div>
							</Show>
							<Show when={brickStore.get.contentChanged}>
								<DocumentChangedBar
									reloading={docState.documentQuery.isFetching}
									onKeep={() => void keepEdits()}
									onReload={() => void reloadChangedContent()}
								/>
							</Show>
							<div ref={split.observe} class="flex flex-1">
								<div
									class={classnames({
										"min-w-0 flex-1": !previewing() && !comparison.open(),
										"shrink-0": previewing(),
										"w-1/2 shrink-0": comparison.open(),
									})}
									style={
										previewing() ? { width: `${split.size()}px` } : undefined
									}
								>
									<CollectionPseudoBrick
										fields={collectionFields()}
										collectionMigrationStatus={
											docState.collection()?.migrationStatus
										}
										collectionKey={docState.collectionKey()}
										documentId={docState.documentId()}
										hasFollowingSection={
											fixedBrickConfig().length > 0 ||
											builderBrickConfig().length > 0
										}
									/>
									<FixedBricks
										brickConfig={fixedBrickConfig()}
										collectionMigrationStatus={
											docState.collection()?.migrationStatus
										}
										collectionKey={docState.collectionKey()}
										documentId={docState.documentId()}
										hasFollowingSection={builderBrickConfig().length > 0}
									/>
									<BuilderBricks
										brickConfig={builderBrickConfig()}
										collectionMigrationStatus={
											docState.collection()?.migrationStatus
										}
										collectionKey={docState.collectionKey()}
										documentId={docState.documentId()}
									/>
									<Show when={detailsBelow()}>
										<DocumentSidebar
											class="border-t border-border"
											padding="lg"
											collection={docState.collection}
											collectionKey={docState.collectionKey}
											document={docState.document}
											refs={docState.refs}
											autoSaveMetadata={mutations.autoSaveMetadata}
											documentId={docState.documentId}
											disabled={disableWorkflow}
											mutations={mutations}
											requestContext={Boolean(props.request)}
										/>
									</Show>
									<Show when={showNotices()}>
										<div class="pointer-events-none sticky bottom-6 z-30 my-6 flex flex-wrap justify-center gap-4 px-4">
											<Show when={!editors.noticeOpen() && editors.holder()}>
												{(holder) => (
													<Alert
														variant="warning"
														appearance="pill"
														class="pointer-events-auto"
													>
														{holder().self
															? T()("documents.held.self.view.only")
															: T()("documents.held.view.only", {
																	name: helpers.formatUserName(
																		holder().user,
																		"name",
																	),
																})}
														<button
															type="button"
															class="ml-3 rounded-sm font-medium text-warning-foreground underline underline-offset-2 decoration-warning-foreground/50 hover:text-warning-foreground hover:decoration-warning-foreground focus:ring-warning-foreground focus-visible:ring-1"
															disabled={editors.takingOver()}
															aria-busy={editors.takingOver()}
															onClick={() => void editors.takeOver()}
														>
															{editors.takingOver()
																? T()("documents.held.taking.over")
																: T()("documents.held.take.over")}
														</button>
													</Alert>
												)}
											</Show>
											<Show when={uiState.collectionNeedsMigrating()}>
												<Alert
													variant="warning"
													appearance="pill"
													class="pointer-events-auto"
												>
													{T()("collections.migrations.required.message")}
												</Alert>
											</Show>
										</div>
									</Show>
								</div>
								<Switch>
									<Match when={detailsBeside()}>
										<DetailsColumn>
											<DocumentSidebar
												collection={docState.collection}
												collectionKey={docState.collectionKey}
												document={docState.document}
												refs={docState.refs}
												autoSaveMetadata={mutations.autoSaveMetadata}
												documentId={docState.documentId}
												disabled={disableWorkflow}
												mutations={mutations}
												requestContext={Boolean(props.request)}
											/>
										</DetailsColumn>
									</Match>
									<Match when={previewing()}>
										<BuilderSplitHandle split={split} />
										<div class="sticky top-(--document-header-bar-height) flex h-[calc(100dvh-var(--document-header-bar-height,0px)-0.5rem)] min-w-0 flex-1 self-start">
											<DocumentPreview
												open={previewing}
												collectionKey={docState.collectionKey}
												documentId={docState.documentId}
												versionType={versionType}
												versionId={versionId}
												mode={preview.mode}
												locale={preview.locale}
												breakpoints={() =>
													docState.collection()?.preview?.breakpoints ?? []
												}
												dirty={docState.isDocumentMutated}
												saveStamp={preview.saveStamp}
												draftVersionId={() =>
													docState.document()?.versionId ?? undefined
												}
												canSyncDraft={canSyncPreviewDraft}
												route={() => docState.document()?.route}
												canEdit={() =>
													canSyncPreviewDraft() && !brickStore.get.locked
												}
												editingDetails={previewEditingDetails}
												errors={previewErrors}
												builderTarget={previewFocus.builderTarget}
												onFocusField={(target, options) =>
													void previewFocus.requestTarget(target, options)
												}
												dragged={previewStructure.dragged}
												onChange={previewStructure.handle}
												onUndo={previewStructure.undo}
												repeaterCapacity={previewStructure.capacity}
												fieldEdit={previewFieldEdit}
												agent={previewAgent}
												registerScrollCapture={registerPreviewScrollCapture}
												consumeScrollRestore={consumePreviewScrollRestore}
												onDeselect={previewFocus.deselect}
												toolbarMount={previewToolbar}
											/>
										</div>
									</Match>
									<Match when={comparison.open()}>
										<div class="min-w-0 flex-1 border-s border-border">
											<Show when={comparison.changed()}>
												<Alert variant="warning" appearance="bar">
													<div class="flex items-center justify-between gap-3">
														<span>{T()("documents.compare.changed")}</span>
														<Button
															size="xs"
															variant="outline"
															loading={comparison.query.isFetching}
															onClick={() => void comparison.refresh()}
														>
															{T()("documents.compare.refresh")}
														</Button>
													</div>
												</Alert>
											</Show>
											<Show
												when={
													comparison.pinned() ||
													comparison.selected()?.versionId !== null
												}
												fallback={
													<p class="p-6 text-sm text-body">
														{T()("documents.compare.unpublished")}
													</p>
												}
											>
												<Show
													when={comparison.pinned()}
													fallback={
														<Show
															when={comparison.query.isError}
															fallback={
																<Skeleton class="grid gap-4 p-4 md:p-6">
																	<span class="skeleton block h-48 w-full" />
																	<span class="skeleton block h-24 w-full" />
																	<span class="skeleton block h-72 w-full" />
																</Skeleton>
															}
														>
															<p class="p-6 text-sm text-body">
																{T()("documents.compare.error")}
															</p>
														</Show>
													}
												>
													{(response) => (
														<ReadOnlyDocument
															store={comparison.rightStore}
															document={() => response().data}
															refs={() => response().refs}
														/>
													)}
												</Show>
											</Show>
										</div>
									</Match>
								</Switch>
							</div>
							<PageLayoutCorners position="bottom" tight={previewing()} />
						</div>
					</div>
					<Show when={docState.document()}>
						{(document) => (
							<AlignDocumentModal
								onAligned={mutations.clearAutoSaveMetadata}
								open={alignOpen()}
								setOpen={setAlignOpen}
								sources={alignmentSources()}
								document={document()}
								destinationContentId={destinationContentId()}
								busy={
									uiState.isSaving() ||
									uiState.isAutoSaving() ||
									autoSave.isDraftCheckPending()
								}
								retainsRevision={
									versionType() === "latest" &&
									docState.collection()?.revisions.enabled === true
								}
								refetch={() => docState.documentQuery.refetch()}
							/>
						)}
					</Show>

					<PageBuilderModals
						hooks={{
							mutations: mutations,
							state: docState,
							uiState: uiState,
							navigationGuard: navigationGuard,
						}}
					/>
					<DocumentHeldModal
						open={editors.noticeOpen()}
						holder={editors.holder()}
						takingOver={editors.takingOver()}
						error={editors.takeOverError()}
						onDismiss={editors.dismissNotice}
						onLeave={leave}
						onTakeOver={() => void editors.takeOver()}
					/>
				</PageBuilderStateProvider>
			</Match>
		</Switch>
	);
};

export default DocumentEditorPage;
