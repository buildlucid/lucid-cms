import type { PreviewScrollState } from "@lucidcms/preview-protocol";
import { useNavigate, useParams } from "@solidjs/router";
import type { PublishOperation } from "@types";
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
import { BuilderBricks } from "@/components/BuilderBricks/BuilderBricks";
import { CollectionPseudoBrick } from "@/components/CollectionPseudoBrick/CollectionPseudoBrick";
import CustomFieldGenerationModal from "@/components/CustomFieldGenerationModal/CustomFieldGenerationModal";
import { DocumentPreview } from "@/components/DocumentPreview/DocumentPreview";
import { DocumentSidebar } from "@/components/DocumentSidebar/DocumentSidebar";
import { FixedBricks } from "@/components/FixedBricks/FixedBricks";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import { PageBuilderHeader } from "@/components/PageBuilderHeader/PageBuilderHeader";
import { ReleaseRequestSidebar } from "@/components/ReleaseRequestSidebar/ReleaseRequestSidebar";
import { useDocumentAutoSave } from "@/hooks/useDocumentAutoSave/useDocumentAutoSave";
import { useDocumentMutations } from "@/hooks/useDocumentMutations/useDocumentMutations";
import { useDocumentPreview } from "@/hooks/useDocumentPreview/useDocumentPreview";
import { useDocumentState } from "@/hooks/useDocumentState/useDocumentState";
import { useDocumentUIState } from "@/hooks/useDocumentUIState/useDocumentUIState";
import { useNavigationGuard } from "@/hooks/useNavigationGuard/useNavigationGuard";
import { PageBuilderStateProvider } from "@/hooks/usePageBuilderState/usePageBuilderState";
import { usePreviewFocus } from "@/hooks/usePreviewFocus/usePreviewFocus";
import brickStore from "@/store/brickStore/brickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import T from "@/translations";
import { PageBuilderModals } from "./parts/PageBuilderModals";

const DocumentEditorPage: Component<{
	mode: "create" | "edit";
	version?: "latest" | "revision" | "snapshot";
	versionId?: Accessor<number | undefined>;
	releaseRequest?: Accessor<PublishOperation | undefined>;
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
		createSingleVersionMutation: mutations.createSingleVersionMutation,
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		createPublishOperationMutation: mutations.createPublishOperationMutation,
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
				: versionType() === "snapshot"
					? `snapshot:${versionId() ?? "unknown"}`
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
	const disableWorkflow = createMemo(
		() =>
			docState.collection()?.locked === true ||
			docState.document()?.isDeleted === true,
	);
	const trailingBreadcrumbs = createMemo(() => {
		const releaseRequest = props.releaseRequest?.();
		if (!releaseRequest) return undefined;

		return [
			{
				label: `#${releaseRequest.id}`,
			},
		];
	});
	const currentViewLabel = createMemo(() => {
		const releaseRequest = props.releaseRequest?.();
		if (!releaseRequest) return undefined;

		return T()("routes.publish.requests.detail.title", {
			id: releaseRequest.id,
		});
	});
	const relationVersionType = createMemo(() => {
		if (versionType() === "revision") return "latest";
		if (versionType() === "snapshot") {
			return props.releaseRequest?.()?.target ?? versionType();
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
					releaseRequest={props.releaseRequest}
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
							showPreview: uiState.showPreview,
							previewOpen: uiState.getPreviewOpen,
							isDocumentMutated: docState.isDocumentMutated,
						}}
						actions={{
							upsertDocumentAction: mutations.upsertDocumentAction,
							publishDocumentAction: mutations.publishDocumentAction,
							restoreRevisionAction: mutations.restoreRevisionAction,
							togglePreview: () => {
								uiState.setPreviewOpen(!uiState.getPreviewOpen());
							},
							beforeVersionChange: preparePreviewVersionChange,
						}}
					/>
					{/* the sidebar offset is this page's, so the alerts stay unaware of it */}
					<div
						class={classnames(
							"fixed bottom-6 left-0 md:left-55 right-0 z-30 flex justify-center gap-4 px-4 pointer-events-none",
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
						<div class="w-full min-h-0 flex flex-col xl:flex-row grow items-stretch xl:items-start bg-background rounded-t-xl border border-border">
							<div class="w-full min-w-0 grow flex flex-col">
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
							</div>
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
							{!uiState.getPreviewOpen() &&
								(props.releaseRequest ? (
									<ReleaseRequestSidebar
										collection={docState.collection}
										releaseRequest={props.releaseRequest}
									/>
								) : (
									<DocumentSidebar
										collection={docState.collection}
										collectionKey={docState.collectionKey}
										document={docState.document}
										refs={docState.refs}
										autoSaveMetadata={mutations.autoSaveMetadata}
										documentId={docState.documentId}
										disabled={disableWorkflow}
										mutations={mutations}
									/>
								))}
						</div>
					</div>
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
