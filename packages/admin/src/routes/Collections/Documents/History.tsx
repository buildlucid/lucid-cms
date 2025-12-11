import T from "@/translations";
import { type Component, For, Show, Switch, Match } from "solid-js";
import { useHistoryState } from "@/hooks/document/useHistoryState";
import { useHistoryUIState } from "@/hooks/document/useHistoryUIState";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import Button from "@/components/Partials/Button";
import TimelineCardWrapper from "@/components/Groups/PageBuilder/History/TimelineCard";
import TimelineDetails from "@/components/Groups/PageBuilder/History/TimelineDetails";

const CollectionsDocumentsHistoryRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const state = useHistoryState();
	const uiState = useHistoryUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
	});

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match
				when={
					state.isLoading() && state.searchParams.getPagination().page === 1
				}
			>
				<span class="absolute top-0 left-[220px] right-4 h-32 bg-background-hover z-5" />
				<div class="fixed top-4 left-[220px] bottom-4 right-4 flex flex-col z-10">
					<span class="h-32 w-full skeleton block mb-4" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={state.isSuccess()}>
				<HeaderBar
					mode={undefined}
					state={{
						collection: state.collection,
						collectionKey: state.collectionKey,
						collectionName: state.collectionName,
						collectionSingularName: state.collectionSingularName,
						documentID: state.documentId,
						document: state.document,
						ui: uiState,
						showRevisionNavigation: () => true,
					}}
					actions={{}}
				/>
				<div class="mt-2 bg-background-base dotted-background rounded-t-xl border border-border flex-grow overflow-hidden">
					<div class="w-[calc(calc(100%-220px)/2)] p-6 pl-20 relative before:absolute before:left-20 before:top-0 before:bottom-0 before:w-0.5 before:bg-secondary-base/20 before:z-0 before:-translate-x-1/2">
						<For each={state.timelineData()}>
							{(group) => (
								<div class="mb-6 last:mb-0 ml-4">
									<div class="mb-4">
										<span class="inline-block px-2 py-1 text-xs font-medium text-secondary-contrast bg-secondary-base rounded-full -ml-4 -translate-x-1/2">
											{group.dateLabel}
										</span>
									</div>
									<div class="space-y-3">
										<For each={group.items}>
											{(item) => (
												<TimelineCardWrapper
													item={item}
													state={state}
													level={0}
												/>
											)}
										</For>
									</div>
								</div>
							)}
						</For>
						<Show when={state.hasMore()}>
							<div class="mt-6 flex justify-center">
								<Button
									theme="border-outline"
									size="medium"
									onClick={state.loadMore}
									loading={state.isLoading()}
								>
									{T()("load_more")}
								</Button>
							</div>
						</Show>
					</div>
				</div>
				<div class="fixed z-100 top-28 right-8 bottom-4 w-[calc(calc(100%-220px)/2)] border border-border rounded-xl bg-card-base overflow-y-auto">
					<div class="p-5">
						<Show when={state.selectedItem()}>
							{(item) => (
								<TimelineDetails
									item={item()}
									revisionName={state.revisionName()}
									onRevisionNameChange={state.setRevisionName}
									onRestore={state.handleRestoreRevision}
									onPromote={state.handlePromoteToEnvironment}
									collection={state.collection}
								/>
							)}
						</Show>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsHistoryRoute;
