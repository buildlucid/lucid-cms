import T from "@/translations";
import {
	type Component,
	Switch,
	Match,
	Show,
	createEffect,
	on,
} from "solid-js";
import {
	Header,
	ActionBar,
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
	version: "draft" | "published";
}

const CollectionsDocumentsEditRoute: Component<
	CollectionsDocumentsEditRouteProps
> = (props) => {
	// ----------------------------------
	// Hooks & State
	const docState = useDocumentState(props);

	const mutations = useDocumentMutations({
		collection: docState.collection,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		collectionSingularName: docState.collectionSingularName,
		version: props.version,
		mode: props.mode,
		document: docState.document,
	});

	const uiState = useDocumentUIState({
		collectionQuery: docState.collectionQuery,
		collection: docState.collection,
		document: docState.document,
		documentQuery: docState.documentQuery,
		mode: props.mode,
		version: props.version,
		createDocumentMutation: mutations.createDocumentMutation,
		createSingleVersionMutation: mutations.createSingleVersionMutation,
	});

	useDocumentAutoSave({
		updateSingleVersionMutation: mutations.updateSingleVersionMutation,
		document: docState.document,
		collection: docState.collection,
		hasAutoSavePermission: uiState.hasAutoSavePermission,
	});

	// ------------------------------------------
	// Setup document state
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			docState.collection()?.config.useTranslations || false,
		);
		brickStore.get.setBricks(docState.document(), docState.collection());
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
				<div class="fixed top-15 left-[325px] bottom-15 right-15 flex flex-col">
					<span class="h-32 w-full skeleton block mb-15" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={uiState.isSuccess()}>
				<Header
					mode={props.mode}
					version={props.version}
					state={{
						collection: docState.collection,
						collectionKey: docState.collectionKey,
						collectionName: docState.collectionName,
						collectionSingularName: docState.collectionSingularName,
						documentID: docState.documentId,
						canNavigateToPublished: uiState.canNavigateToPublished,
						showRevisionNavigation: uiState.showRevisionNavigation,
					}}
				/>
				<ActionBar
					mode={props.mode}
					version={props.version}
					state={{
						collection: docState.collection,
						document: docState.document,
						ui: uiState,
					}}
					actions={{
						upsertDocumentAction: mutations.upsertDocumentAction,
						publishDocumentAction: mutations.publishDocumentAction,
					}}
				/>

				<div class="mt-15 bg-container-3 rounded-t-xl border border-border flex-grow overflow-hidden">
					<Alert
						style="layout"
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
					<div class="w-full flex grow">
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

				<Show when={uiState.isSaving()}>
					<div class="fixed inset-0 bg-black/60 animate-pulse z-50" />
				</Show>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsEditRoute;
