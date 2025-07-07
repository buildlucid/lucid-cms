import T from "@/translations";
import {
	type Component,
	createEffect,
	Switch,
	Match,
	on,
	Show,
} from "solid-js";
import { useRevisionsState } from "@/hooks/document/useRevisionsState";
import { getDocumentRoute } from "@/utils/route-helpers";
import brickStore from "@/store/brickStore";
import Alert from "@/components/Blocks/Alert";
import Link from "@/components/Partials/Link";
import { useDocumentUIState } from "@/hooks/document/useDocumentUIState";
import { useRevisionMutations } from "@/hooks/document/useRevisionMutations";
import {
	ActionBar,
	Header,
	RevisionsSidebar,
	CollectionPseudoBrick,
	FixedBricks,
	BuilderBricks,
} from "@/components/Groups/PageBuilder";

const CollectionsDocumentsRevisionsRoute: Component = (props) => {
	// ----------------------------------
	// Hooks & State
	const revisionState = useRevisionsState();

	const mutations = useRevisionMutations({
		collectionKey: revisionState.collectionKey,
		documentId: revisionState.documentId,
		collectionSingularName: revisionState.collectionSingularName,
		versionId: revisionState.versionId,
		collection: revisionState.collection,
	});

	const uiState = useDocumentUIState({
		collection: revisionState.collection,
		doc: revisionState.doc(),
		mode: "revisions",
		version: "draft",

		selectedRevision: revisionState.documentId,
		restoreRevisionAction: mutations.restoreRevisionAction,
	});

	// ------------------------------------------
	// Setup document state
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			revisionState.collection.data?.data.config.useTranslations || false,
		);
		brickStore.get.setBricks(
			revisionState.doc().data?.data,
			revisionState.collection.data?.data,
		);
		brickStore.set("locked", true);
	};

	createEffect(
		on(
			() => revisionState.doc().data,
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => revisionState.collection.isSuccess,
			() => {
				setDocumentState();
			},
		),
	);

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={revisionState.documentIsLoading()}>
				<div class="fixed top-15 left-[325px] bottom-15 right-15 flex flex-col">
					<span class="h-32 w-full skeleton block mb-15" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={revisionState.documentIsSuccess()}>
				<Header
					mode={"revisions"}
					state={{
						collection: revisionState.collection.data?.data,
						collectionKey: revisionState.collectionKey,
						collectionName: revisionState.collectionName,
						collectionSingularName: revisionState.collectionSingularName,
						documentID: revisionState.documentId,

						canNavigateToPublished: uiState.canNavigateToPublished,
						showRevisionNavigation: uiState.showRevisionNavigation,
					}}
				/>

				<ActionBar
					mode="revisions"
					state={{
						collection: revisionState.collection.data?.data,
						document: revisionState.doc().data?.data,
						selectedRevision: revisionState.documentId,
						ui: uiState,
					}}
					actions={{
						restoreRevisionAction: mutations.restoreRevisionAction,
					}}
				/>

				<div class="mt-15 bg-container-3 rounded-t-xl border border-border flex-grow overflow-hidden relative">
					<Show when={!revisionState.revisionDoc.data}>
						<div class="absolute inset-0 flex items-center justify-center bg-black/60 flex-col z-20">
							<div class="w-full max-w-xl px-15 py-15 text-center flex flex-col items-center">
								<h2 class="mb-2.5">{T()("no_revisions_found")}</h2>
								<p class="mb-5">{T()("no_revisions_found_message")}</p>
								<Link
									href={getDocumentRoute("edit", {
										collectionKey: revisionState.collectionKey(),
										useDrafts:
											revisionState.collection.data?.data.config.useDrafts,
										documentId: revisionState.documentId(),
									})}
									theme="primary"
									size="medium"
								>
									{T()("back_to_document")}
								</Link>
							</div>
						</div>
					</Show>
					<div class="flex flex-col h-full">
						<Alert
							style="layout"
							alerts={[
								{
									type: "warning",
									message: T()("locked_document_message"),
									show: true,
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
									fields={revisionState.collection.data?.data.fields || []}
									collectionMigrationStatus={
										revisionState.collection.data?.data.migrationStatus
									}
								/>
								<FixedBricks
									brickConfig={
										revisionState.collection.data?.data.fixedBricks || []
									}
									collectionMigrationStatus={
										revisionState.collection.data?.data.migrationStatus
									}
								/>
								<BuilderBricks
									brickConfig={
										revisionState.collection.data?.data.builderBricks || []
									}
									collectionMigrationStatus={
										revisionState.collection.data?.data.migrationStatus
									}
								/>
							</div>
							<RevisionsSidebar
								state={{
									revisions: revisionState.revisionVersions.data?.data || [],
									meta: revisionState.revisionVersions.data?.meta,
									versionId: revisionState.versionId,
									collectionKey: revisionState.collectionKey,
									documentId: revisionState.documentId,
									searchParams: revisionState.revisionsSearchParams,
									isLoading: revisionState.revisionsIsLoading,
									isError: revisionState.anyIsError,
									isSuccess: revisionState.revisionsIsSuccess,
									hideNoEntries: revisionState.versionIdParam() === "latest",
								}}
							/>
						</div>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsRevisionsRoute;
