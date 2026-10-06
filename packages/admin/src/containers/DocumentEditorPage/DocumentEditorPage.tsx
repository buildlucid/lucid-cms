import type { PreviewScrollState } from "@lucidcms/preview-protocol";
import { useNavigate, useParams } from "@solidjs/router";
import type { Release, ReleaseDocument } from "@types";
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
import { useDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import {
	type ComparisonOption,
	useDocumentComparison,
} from "@/hooks/useDocumentComparison/useDocumentComparison";
import { useDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import { useDocumentPreview } from "@/hooks/useDocumentPreview/useDocumentPreview";
import { useDocumentState } from "@/hooks/useDocumentState/useDocumentState";
import { useDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import { useNavigationGuard } from "@/hooks/useNavigationGuard/useNavigationGuard";
import { PageBuilderStateProvider } from "@/hooks/usePageBuilderState/usePageBuilderState";
import { usePreviewFocus } from "@/hooks/usePreviewFocus/usePreviewFocus";
import brickStore from "@/store/brickStore/brickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getReleaseRoute } from "@/utils/route-helpers";
import { PageBuilderModals } from "./parts/PageBuilderModals";

const DocumentEditorPage: Component<{
	mode: "create" | "edit";
	version?: "latest" | "revision" | "snapshot" | "proposal";
	versionId?: Accessor<number | undefined>;
	/** Set when editing a release proposal, which keeps the editor inside its release. */
	release?: Accessor<Release | undefined>;
	releaseDocument?: Accessor<ReleaseDocument | undefined>;
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
			props.release?.()?.status === "open" &&
			props.releaseDocument?.()?.permissions.edit === true,
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
	//* release snapshots can't change, so only latest and proposals open side by side
	const comparisonAvailable = () =>
		props.mode === "edit" &&
		(versionType() === "latest" || versionType() === "proposal");
	//* the side-by-side key of the editable document on the left
	const comparisonKey = createMemo(() => {
		if (versionType() === "latest") return "latest";
		const release = props.release?.();
		return release && versionType() === "proposal"
			? `proposal:${release.id}`
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
			return props.releaseDocument?.()?.contentId ?? undefined;
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
			if (shouldMerge && hasUnsavedChanges) {
				brickStore.set("locked", uiState.isBuilderLocked());
				return;
			}

			if (shouldMerge) {
				brickStore.get.syncBricks(document, collection);
			} else {
				brickStore.get.setBricks(document, collection);
			}
			brickStore.get.setRefs(docState.refs());
			brickStore.set("locked", uiState.isBuilderLocked());
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
	const releaseLink = createMemo(() => {
		const release = props.release?.();
		return release ? getReleaseRoute({ releaseId: release.id }) : undefined;
	});
	const trailingBreadcrumbs = createMemo(() => {
		const release = props.release?.();
		const link = releaseLink();
		return release && link ? [{ label: release.title, link }] : undefined;
	});
	const currentViewLabel = createMemo(() => {
		const release = props.release?.();
		if (!release) return undefined;
		return T()(
			versionType() === "proposal"
				? "releases.proposal.selector"
				: "releases.snapshot.selector",
			{ release: release.title },
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
		for (const target of docState.collection()?.publishing.targets ?? []) {
			const version = document.versions[target.key];
			if (version) {
				sources.push({
					key: target.key,
					label: helpers.getLocaleValue({
						value: target.label,
						fallback: target.key,
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
					release={props.release}
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
						releaseLink={releaseLink()}
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
					{/* the sidebar offset is this page's, so the alerts stay unaware of it */}
					<div
						class={classnames(
							"fixed bottom-6 left-0 md:left-sidebar right-0 z-30 flex justify-center gap-4 px-4 pointer-events-none",
							uiState.getPreviewOpen()
								? "xl:right-4 xl:translate-x-[-27.5%]"
								: "xl:right-80",
						)}
					>
						<Show when={uiState.isBuilderLocked()}>
							<Alert
								variant="warning"
								appearance="pill"
								class="pointer-events-auto"
							>
								{T()("documents.locked.message")}
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
							<div class="w-full min-h-0 flex flex-col xl:flex-row grow items-stretch xl:items-start">
								<ComparisonColumn
									sticky={comparison.open()}
									class={classnames("w-full min-w-0 grow flex flex-col", {
										"xl:w-1/2 xl:flex-none": comparison.open(),
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
										class="w-full min-w-0 xl:w-1/2 xl:flex-none border-t xl:border-t-0 xl:border-s border-border"
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
									<div class="relative w-full min-h-[70vh] xl:w-[55%] xl:min-h-0 xl:flex-none xl:sticky xl:top-(--document-header-bar-height) xl:self-start xl:h-[calc(100vh-var(--document-header-bar-height))]">
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
										(!props.release || versionType() === "proposal")
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
										releaseContext={Boolean(props.release)}
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
					<CustomFieldGenerationModal />
					<MediaAltGenerationModal />
					<MediaImageGenerationModal />
				</PageBuilderStateProvider>
			</Match>
		</Switch>
	);
};

export default DocumentEditorPage;
