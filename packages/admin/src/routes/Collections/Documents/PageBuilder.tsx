import T from "@/translations";
import {
	type Component,
	Switch,
	Match,
	createEffect,
	on,
	createMemo,
} from "solid-js";
import { useParams } from "@solidjs/router";
import {
	HeaderBar,
	Modals,
	BuilderBricks,
	CollectionPseudoBrick,
	FixedBricks,
} from "@/components/Groups/PageBuilder";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import { useDocumentAutoSave } from "@/hooks/document/useDocumentAutoSave";
import Alert from "@/components/Blocks/Alert";
import brickStore from "@/store/brickStore";

interface CollectionsDocumentsEditRouteProps {
	mode: "create" | "edit";
	version?: "latest";
}

const CollectionsDocumentsEditRoute: Component<
	CollectionsDocumentsEditRouteProps
> = (props) => {
	// ----------------------------------
	// Hooks & State
	const params = useParams();
	const versionType = createMemo(() => props.version || params.versionType);

	const docState = useDocumentState({
		mode: props.mode,
		version: versionType,
	});

	const mutations = useDocumentMutations({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		collectionSingularName: docState.collectionSingularName,
		version: versionType,
		mode: props.mode,
		document: docState.document,
	});

	const uiState = useDocumentUIState({
		collectionQuery: docState.collectionQuery,
		collection: docState.collection,
		document: docState.document,
		documentQuery: docState.documentQuery,
		mode: props.mode,
		version: versionType,
		createDocumentMutation: mutations.createDocumentMutation,
		createSingleVersionMutation: mutations.createSingleVersionMutation,
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		promoteToPublishedMutation: mutations.promoteToPublishedMutation,
	});

	const autoSave = useDocumentAutoSave({
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		document: docState.document,
		collection: docState.collection,
		hasAutoSavePermission: uiState.hasAutoSavePermission,
	});

	// ------------------------------------------
	// Setup document state

	// TODO: attempt to merge brick state in when the document ID and collection key are the same. Hopefully cut down on re-renders from nuking the brick store
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			docState.collection()?.config.useTranslations || false,
		);
		brickStore.get.setBricks(docState.document(), docState.collection());
		brickStore.get.setRefs(docState.document());
		brickStore.set("locked", uiState.isBuilderLocked());
	};

	createEffect(
		on(
			() => docState.document(),
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => docState.collectionQuery.isFetchedAfterMount,
			() => {
				setDocumentState();
			},
		),
	);

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={uiState.isLoading()}>
				<span class="absolute top-0 left-[220px] right-4 h-32 bg-background-hover z-5" />
				<div class="fixed top-4 left-[220px] bottom-4 right-4 flex flex-col z-10">
					<span class="h-32 w-full skeleton block mb-4" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={uiState.isSuccess()}>
				<HeaderBar
					mode={props.mode}
					version={versionType}
					state={{
						collection: docState.collection,
						collectionKey: docState.collectionKey,
						collectionName: docState.collectionName,
						collectionSingularName: docState.collectionSingularName,
						documentID: docState.documentId,
						document: docState.document,
						ui: uiState,
						autoSave: autoSave,
						showRevisionNavigation: uiState.showRevisionNavigation,
					}}
					actions={{
						upsertDocumentAction: mutations.upsertDocumentAction,
						publishDocumentAction: mutations.publishDocumentAction,
					}}
				/>
				<div class="mt-2 bg-background-base rounded-t-xl border border-border flex-grow overflow-hidden">
					<Alert
						style="pill"
						alerts={[
							{
								type: "warning",
								message: T()("locked_document_message"),
								show: uiState.isBuilderLocked(),
							},
							{
								type: "warning",
								message: T()("collection_needs_migrating_message"),
								show: uiState.collectionNeedsMigrating(),
							},
						]}
					/>
					<div class="w-full flex grow h-full">
						<div class="w-full flex flex-col">
							<CollectionPseudoBrick
								fields={docState.collection()?.fields || []}
								collectionMigrationStatus={
									docState.collection()?.migrationStatus
								}
								collectionKey={docState.collectionKey()}
								documentId={docState.documentId()}
							/>
							<FixedBricks
								brickConfig={docState.collection()?.fixedBricks || []}
								collectionMigrationStatus={
									docState.collection()?.migrationStatus
								}
								collectionKey={docState.collectionKey()}
								documentId={docState.documentId()}
							/>
							<BuilderBricks
								brickConfig={docState.collection()?.builderBricks || []}
								collectionMigrationStatus={
									docState.collection()?.migrationStatus
								}
								collectionKey={docState.collectionKey()}
								documentId={docState.documentId()}
							/>
						</div>
					</div>
				</div>
				<Modals
					hooks={{
						mutations: mutations,
						state: docState,
						uiState: uiState,
					}}
				/>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsEditRoute;
