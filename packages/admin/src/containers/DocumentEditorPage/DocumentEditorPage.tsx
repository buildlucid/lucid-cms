import type { PreviewScrollState } from "@lucidcms/preview-protocol";
import { useNavigate, useParams } from "@solidjs/router";
import type { RequestDetail, RequestDocument } from "@types";
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
import CustomFieldGenerationModal from "@/components/CustomFieldGenerationModal/CustomFieldGenerationModal";
import ComparisonColumn from "@/components/DocumentComparison/ComparisonColumn";
import DocumentComparisonBar from "@/components/DocumentComparison/DocumentComparisonBar";
import ReadOnlyDocument from "@/components/DocumentComparison/ReadOnlyDocument";
import { DocumentPreview } from "@/components/DocumentPreview/DocumentPreview";
import { DocumentSidebar } from "@/components/DocumentSidebar/DocumentSidebar";
import { FixedBricks } from "@/components/FixedBricks/FixedBricks";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import { PageBuilderHeader } from "@/components/PageBuilderHeader/PageBuilderHeader";
import type { ViewSelectorOption } from "@/components/PageBuilderHeader/parts/ViewSelector";
import WorkflowStageSelect from "@/components/WorkflowStageSelect/WorkflowStageSelect";
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
import { usePreviewFocus } from "@/hooks/usePreviewFocus/usePreviewFocus";
import brickStore from "@/store/brickStore/brickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getRequestRoute } from "@/utils/route-helpers";
import DocumentChangedBar from "./parts/DocumentChangedBar";
import DocumentHeldModal from "./parts/DocumentHeldModal";
import { PageBuilderModals } from "./parts/PageBuilderModals";

const DocumentEditorPage: Component<{
	mode: "create" | "edit";
	version?: "latest" | "revision" | "snapshot" | "proposal";
	versionId?: Accessor<number | undefined>;
	/** Set when editing a request proposal, which keeps the editor inside its request. */
	request?: Accessor<RequestDetail | undefined>;
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
	let hydratedViewKey: string | null = null;
	let capturePreviewScroll:
		| (() => Promise<PreviewScrollState | null>)
		| undefined;
	let pendingPreviewScroll: PreviewScrollState | null = null;
	//* set from the editors below, which need the UI state to know whether this tab can hold the document
	const [heldElsewhere, setHeldElsewhere] = createSignal(false);

	const docState = useDocumentState({
		mode: props.mode,
		version: versionType,
		versionId: versionId,
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
		onHeld: () => void editors.refresh(),
	});

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
		requestCreationMutation: mutations.requestCreationMutation,
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
	//* the agent works on what this editor shows, unsaved changes included
	useBuilderTools({
		enabled: () =>
			uiState.isSuccess() &&
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
	createEffect(() => {
		if (comparison.open()) uiState.setPreviewOpen(false);
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
	const previewFocus = usePreviewFocus({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		locales: docState.contentLocales,
		hasUnsavedContent: brickStore.getDocumentContentMutated,
		hasUnsavedBuilderStructure: brickStore.getBuilderBrickStructureMutated,
	});

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
		const shouldMerge = nextViewKey !== null && hydratedViewKey === nextViewKey;
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

		hydratedViewKey = nextViewKey;

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

	onCleanup(() => {
		if (snapshotTimeout !== undefined) clearTimeout(snapshotTimeout);
		hydratedViewKey = null;
		capturePreviewScroll = undefined;
		pendingPreviewScroll = null;
		brickStore.get.reset();
		pageBuilderModalsStore.reset();
	});

	//* Redirect out of the document view when the document/collection isn't available.
	//* Multiple collections fall back to their document list, everything else to the dashboard.
	createEffect(() => {
		if (docState.collectionAccessError()) {
			navigate("/lucid", { replace: true });
			return;
		}
		if (docState.documentAccessError()) {
			if (docState.collection()?.mode === "multiple") {
				navigate(`/lucid/collections/${docState.collectionKey()}`, {
					replace: true,
				});
				return;
			}
			navigate("/lucid", { replace: true });
		}
	});

	// ---------------------------------
	// Memos
	const [alignOpen, setAlignOpen] = createSignal(false);
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
	const trailingBreadcrumbs = createMemo(() => {
		const request = props.request?.();
		const link = requestLink();
		return request && link ? [{ label: request.title, link }] : undefined;
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

	// ----------------------------------
	// Functions
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
				? `/lucid/collections/${docState.collectionKey()}`
				: "/lucid",
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
			<Match
				when={
					uiState.isLoading() ||
					getStateLoading() ||
					docState.collectionsQuery.isLoading
				}
			>
				<div class="-mt-4 relative bg-background rounded-b-xl border border-border h-36">
					<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
				</div>
				<div class="mt-2 bg-background rounded-t-xl border border-border grow overflow-hidden relative">
					<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
						<span class="h-62 w-full skeleton block mb-4" />
						<span class="h-full w-full skeleton block" />
					</div>
				</div>
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
					<PageBuilderHeader
						mode={props.mode}
						version={versionType}
						versionId={versionId}
						trailingBreadcrumbs={trailingBreadcrumbs}
						currentViewLabel={currentViewLabel}
						comparison={
							comparison.available() &&
							comparison
								.options()
								.some(
									(option) =>
										option.versionId !== null && option.key !== comparisonKey(),
								)
								? { open: comparison.open, toggle: comparison.toggle }
								: undefined
						}
						requestLink={requestLink()}
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
							showPreview: () => uiState.showPreview() && !comparison.open(),
							previewOpen: uiState.getPreviewOpen,
							isDocumentMutated: docState.isDocumentMutated,
						}}
						actions={{
							upsertDocumentAction: mutations.upsertDocumentAction,
							publishDocumentAction: mutations.publishDocumentAction,
							restoreRevisionAction: mutations.restoreRevisionAction,
							togglePreview: () =>
								uiState.setPreviewOpen(!uiState.getPreviewOpen()),
							requestAlignment: canAlign()
								? () => {
										autoSave.debouncedAutoSave.clear();
										setAlignOpen(true);
									}
								: undefined,
							beforeVersionChange: resolveVersionChange,
						}}
					/>
					{/* the sidebar and agent panel offsets are this page's, so the alerts stay unaware of them */}
					<div
						class={classnames(
							"fixed bottom-6 left-0 md:left-sidebar right-agent-panel z-30 flex justify-center gap-4 px-4 pointer-events-none",
							uiState.getPreviewOpen()
								? "content-xl:right-[calc(var(--spacing-agent-panel)+(--spacing(4)))] content-xl:translate-x-[-27.5%]"
								: "content-xl:right-[calc(var(--spacing-agent-panel)+(--spacing(80)))]",
						)}
					>
						<Show when={uiState.isDocumentLocked()}>
							<Alert
								variant="warning"
								appearance="pill"
								class="pointer-events-auto"
							>
								{T()("documents.locked.message")}
							</Alert>
						</Show>
						<Show when={editors.holder()}>
							<Alert
								variant="warning"
								appearance="pill"
								class="pointer-events-auto"
							>
								{T()("documents.held.view.only")}
								<button
									type="button"
									class="ml-3 rounded-sm font-medium text-warning-foreground underline underline-offset-2 decoration-warning-foreground/50 hover:text-warning-foreground hover:decoration-warning-foreground focus:ring-warning-foreground focus-visible:ring-1"
									disabled={editors.takingOver()}
									onClick={() => void editors.takeOver()}
								>
									{T()("documents.held.take.over")}
								</button>
							</Alert>
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
					<div class="mt-2 flex min-h-0 grow flex-col overflow-visible">
						<div class="w-full min-h-0 flex flex-col grow bg-background rounded-t-xl border border-border [--comparison-bar-height:2.75rem]">
							<Show when={comparison.open()}>
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
							</Show>
							<Show when={brickStore.get.contentChanged}>
								<DocumentChangedBar
									reloading={docState.documentQuery.isFetching}
									onKeep={() => void keepEdits()}
									onReload={() => void reloadChangedContent()}
								/>
							</Show>
							<div class="w-full min-h-0 flex flex-col content-xl:flex-row grow items-stretch content-xl:items-start">
								<ComparisonColumn
									sticky={comparison.open()}
									class={classnames("w-full min-w-0 grow flex flex-col", {
										"content-xl:w-1/2 content-xl:flex-none": comparison.open(),
									})}
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
								</ComparisonColumn>
								<Show when={comparison.open()}>
									<ComparisonColumn
										sticky={true}
										class="w-full min-w-0 content-xl:w-1/2 content-xl:flex-none border-t content-xl:border-t-0 content-xl:border-s border-border"
									>
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
															<div
																class="grid gap-4 p-4 md:p-6"
																aria-busy="true"
															>
																<span class="skeleton block h-48 w-full" />
																<span class="skeleton block h-24 w-full" />
																<span class="skeleton block h-72 w-full" />
															</div>
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
									</ComparisonColumn>
								</Show>

								<Show when={uiState.getPreviewOpen()}>
									<div class="relative w-full min-h-[70vh] content-xl:w-[55%] content-xl:min-h-0 content-xl:flex-none content-xl:sticky content-xl:top-(--document-header-bar-height) content-xl:self-start content-xl:h-[calc(100vh-var(--document-header-bar-height))]">
										<DocumentPreview
											open={uiState.getPreviewOpen}
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
											onFocusField={previewFocus.requestTarget}
											registerScrollCapture={registerPreviewScrollCapture}
											consumeScrollRestore={consumePreviewScrollRestore}
										/>
									</div>
								</Show>
								<Show
									when={
										!comparison.open() &&
										!uiState.getPreviewOpen() &&
										(!props.request || versionType() === "proposal")
									}
								>
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
								</Show>
							</div>
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
						holder={editors.holder()}
						takingOver={editors.takingOver()}
						onLeave={leave}
						onTakeOver={() => void editors.takeOver()}
					/>
					<CustomFieldGenerationModal />
					<MediaAltGenerationModal />
					<MediaImageGenerationModal />
				</PageBuilderStateProvider>
			</Match>
		</Switch>
	);
};

export default DocumentEditorPage;
