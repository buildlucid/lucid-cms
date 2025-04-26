import T from "@/translations";
import { type Component, Switch, Match, Show } from "solid-js";
import { Header, ActionBar } from "@/components/Groups/PageBuilder";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import Alert from "@/components/Blocks/Alert";
import {
	BuilderBricks,
	CollectionPseudoBrick,
	FixedBricks,
} from "@/components/Groups/Document";

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
					hooks={{
						mutations: mutations,
						state: docState,
						uiState: uiState,
					}}
				/>
				<ActionBar
					mode={props.mode}
					version={props.version}
					hooks={{
						mutations: mutations,
						state: docState,
						uiState: uiState,
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
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsEditRoute;
