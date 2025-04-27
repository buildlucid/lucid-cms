import T from "@/translations";
import {
	type Component,
	Switch,
	Match,
	Show,
	createEffect,
	on,
} from "solid-js";
import { Header, ActionBar, Modals } from "@/components/Groups/PageBuilder";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import Alert from "@/components/Blocks/Alert";
import {
	BuilderBricks,
	CollectionPseudoBrick,
	FixedBricks,
} from "@/components/Groups/Document";
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
		collection: docState.collection.data?.data,
		collectionKey: docState.collectionKey,
		documentId: docState.documentId,
		collectionSingularName: docState.collectionSingularName,
		version: props.version,
		mode: props.mode,
	});

	const uiState = useDocumentUIState({
		collection: docState.collection,
		doc: docState.doc,
		mode: props.mode,
		version: props.version,
		createDocument: mutations.createDocument,
		updateSingle: mutations.updateSingle,
	});

	// ------------------------------------------
	// Setup document state
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			docState.collection.data?.data.config.useTranslations || false,
		);
		brickStore.get.setBricks(
			docState.doc.data?.data,
			docState.collection.data?.data,
		);
		brickStore.set("locked", uiState.isBuilderLocked());
	};

	createEffect(
		on(
			() => docState.doc.data,
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => docState.collection.isSuccess,
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
						collection: docState.collection.data?.data,
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
						collection: docState.collection.data?.data,
						document: docState.doc.data?.data,
						ui: uiState,
					}}
					actions={{
						upsertDocumentAction: mutations.upsertDocumentAction,
						publishDocumentAction: mutations.publishDocumentAction,
					}}
				/>

				<div class="mt-15 bg-container-3 rounded-t-xl border border-border flex-grow overflow-hidden">
					<Show when={uiState.isBuilderLocked()}>
						<Alert
							style="layout"
							alerts={[
								{
									type: "warning",
									message: T()("locked_document_message"),
									show: uiState.isBuilderLocked(),
								},
							]}
						/>
					</Show>
					<div class="w-full flex grow">
						<div class="w-full flex flex-col">
							<CollectionPseudoBrick
								fields={docState.collection.data?.data.fields || []}
							/>
							<FixedBricks
								brickConfig={docState.collection.data?.data.fixedBricks || []}
							/>
							<BuilderBricks
								brickConfig={docState.collection.data?.data.builderBricks || []}
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
