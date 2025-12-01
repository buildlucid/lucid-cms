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
	RevisionsSidebar,
	CollectionPseudoBrick,
	FixedBricks,
	BuilderBricks,
	HeaderBar,
} from "@/components/Groups/PageBuilder";

const CollectionsDocumentsRevisionsRoute: Component = () => {
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
		collectionQuery: revisionState.collectionQuery,
		documentQuery: revisionState.documentQuery(),
		document: revisionState.document,
		collection: revisionState.collection,
		mode: "revisions",
		version: () => "latest",
		selectedRevision: revisionState.documentId,
		restoreRevisionAction: mutations.restoreRevisionAction,
	});

	// ------------------------------------------
	// Setup document state
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			revisionState.collection()?.config.useTranslations || false,
		);
		brickStore.get.setRefs(revisionState.document());
		brickStore.get.setBricks(
			revisionState.document(),
			revisionState.collection(),
		);
		brickStore.set("locked", true);
	};

	createEffect(
		on(
			() => revisionState.document(),
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => revisionState.collectionQuery.isSuccess,
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
				<span class="absolute top-0 left-[220px] right-4 h-32 bg-background-hover z-5" />
				<div class="fixed top-4 left-[220px] bottom-4 right-4 flex flex-col z-10">
					<span class="h-32 w-full skeleton block mb-4" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={revisionState.documentIsSuccess()}>
				<HeaderBar
					mode={"revisions"}
					state={{
						collection: revisionState.collection,
						collectionKey: revisionState.collectionKey,
						collectionName: revisionState.collectionName,
						collectionSingularName: revisionState.collectionSingularName,
						documentID: revisionState.documentId,
						document: revisionState.document,
						ui: uiState,
						showRevisionNavigation: uiState.showRevisionNavigation,
						selectedRevision: revisionState.documentId,
					}}
					actions={{
						restoreRevisionAction: mutations.restoreRevisionAction,
					}}
				/>
				<div class="mt-2 bg-background-base rounded-t-xl border border-border flex-grow overflow-hidden relative">
					<Show when={!revisionState.revisionDocument()}>
						<div class="absolute inset-0 flex items-center justify-center bg-black/80 flex-col z-20">
							<div class="w-full max-w-xl px-4 md:p-6 text-center flex flex-col items-center bg-card-base border border-border rounded-md">
								<h2 class="mb-2">{T()("no_revisions_found")}</h2>
								<p class="mb-5 text-sm">{T()("no_revisions_found_message")}</p>
								<Link
									href={getDocumentRoute("edit", {
										collectionKey: revisionState.collectionKey(),
										documentId: revisionState.documentId(),
									})}
									theme="border-outline"
									size="medium"
								>
									{T()("back_to_document")}
								</Link>
							</div>
						</div>
					</Show>
					<div class="flex flex-col h-full">
						<Alert
							style="pill"
							alerts={[
								{
									type: "warning",
									message: T()("locked_document_message"),
									show: !!revisionState.revisionDocument(),
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
									fields={revisionState.collection()?.fields || []}
									collectionMigrationStatus={
										revisionState.collection()?.migrationStatus
									}
									collectionKey={revisionState.collectionKey()}
									documentId={revisionState.documentId()}
								/>
								<FixedBricks
									brickConfig={revisionState.collection()?.fixedBricks || []}
									collectionMigrationStatus={
										revisionState.collection()?.migrationStatus
									}
									collectionKey={revisionState.collectionKey()}
									documentId={revisionState.documentId()}
								/>
								<BuilderBricks
									brickConfig={revisionState.collection()?.builderBricks || []}
									collectionMigrationStatus={
										revisionState.collection()?.migrationStatus
									}
									collectionKey={revisionState.collectionKey()}
									documentId={revisionState.documentId()}
								/>
							</div>
							<RevisionsSidebar
								state={{
									revisions:
										revisionState.revisionVersionsQuery.data?.data || [],
									meta: revisionState.revisionVersionsQuery.data?.meta,
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
