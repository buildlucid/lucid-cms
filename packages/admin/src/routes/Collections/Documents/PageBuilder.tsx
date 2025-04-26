import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import { type Component, Switch, Match } from "solid-js";
import { useQueryClient } from "@tanstack/solid-query";
import { Header, ActionBar } from "@/components/Groups/PageBuilder";
import { useDocumentState } from "@/hooks/document/useDocumentState";
import { useDocumentMutations } from "@/hooks/document/useDocumentMutations";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";

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

				<div class="mt-15 bg-container-3 rounded-t-xl border border-border p-15 flex-grow">
					page builder Fugiat consequat magna magna amet sit anim minim. Quis
					pariatur cillum proident fugiat. Laborum elit Lorem consectetur qui
					magna exercitation nulla ex do do sit mollit non. Pariatur velit
					laborum ut veniam dolor sint cupidatat elit cupidatat. Enim anim
					consectetur ipsum veniam non. Cupidatat nisi cupidatat deserunt ea
					consectetur in
				</div>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsEditRoute;
