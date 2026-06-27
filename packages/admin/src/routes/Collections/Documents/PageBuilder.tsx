import { useNavigate, useParams } from "@solidjs/router";
import type { PublishOperation } from "@types";
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
	Switch,
} from "solid-js";
import Alert from "@/components/Blocks/Alert";
import {
	BuilderBricks,
	CollectionPseudoBrick,
	FixedBricks,
	HeaderBar,
	Modals,
	Sidebar,
} from "@/components/Groups/PageBuilder";
import { ReleaseRequestSidebar } from "@/components/Groups/PageBuilder/Sidebar/ReleaseRequestSidebar";
import CustomFieldGenerationModal from "@/components/Modals/AI/CustomFieldGenerationModal";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/Modals/AI/MediaImageGenerationModal";
import { useDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import { useDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import { useNavigationGuard } from "@/hooks/document/useNavigationGuard";
import { PageBuilderStateProvider } from "@/hooks/document/usePageBuilderState";
import brickStore from "@/store/brickStore";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore";
import T from "@/translations";

const CollectionsDocumentsEditRoute: Component<{
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

	const navigationGuard = useNavigationGuard(docState.shouldBlockNavigation);

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

			brickStore.set("collectionLocalized", collection.localized || false);

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
			brickStore.get.setRefs(document);
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
		brickStore.get.reset();
		pageBuilderModalsStore.reset();
	});

	//* Redirect out of the document view when the document/collection isn't
	//* available for the active tenant (e.g. after switching tenant). Multiple
	//* collections fall back to their document list, everything else to the dashboard.
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
			<Match when={uiState.isLoading() || getStateLoading()}>
				<div class="-mt-4 relative bg-background-base rounded-b-xl border border-border h-36">
					<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
				</div>
				<div class="mt-2 bg-background-base rounded-t-xl border border-border grow overflow-hidden relative">
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
					<HeaderBar
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
							isDocumentMutated: docState.isDocumentMutated,
						}}
						actions={{
							upsertDocumentAction: mutations.upsertDocumentAction,
							publishDocumentAction: mutations.publishDocumentAction,
							restoreRevisionAction: mutations.restoreRevisionAction,
						}}
					/>
					<Alert
						style="pill"
						class="xl:right-80"
						alerts={[
							{
								type: "warning",
								message: T()("documents.locked.message"),
								show: uiState.isBuilderLocked(),
							},
							{
								type: "warning",
								message: T()("collections.migrations.required.message"),
								show: uiState.collectionNeedsMigrating(),
							},
						]}
					/>
					<div class="mt-2 grow overflow-hidden">
						<div class="w-full flex flex-col xl:flex-row grow h-full  bg-background-base rounded-t-xl border border-border">
							<div class={"w-full min-w-0 flex flex-col"}>
								<CollectionPseudoBrick
									fields={collectionFields()}
									collectionMigrationStatus={
										docState.collection()?.migrationStatus
									}
									collectionKey={docState.collectionKey()}
									documentId={docState.documentId()}
								/>
								<FixedBricks
									brickConfig={fixedBrickConfig()}
									collectionMigrationStatus={
										docState.collection()?.migrationStatus
									}
									collectionKey={docState.collectionKey()}
									documentId={docState.documentId()}
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
							{props.releaseRequest ? (
								<ReleaseRequestSidebar
									collection={docState.collection}
									releaseRequest={props.releaseRequest}
								/>
							) : (
								<Sidebar
									collection={docState.collection}
									collectionKey={docState.collectionKey}
									document={docState.document}
									autoSaveMetadata={mutations.autoSaveMetadata}
									documentId={docState.documentId}
									disabled={disableWorkflow}
									mutations={mutations}
								/>
							)}
						</div>
					</div>
					<Modals
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

export default CollectionsDocumentsEditRoute;
