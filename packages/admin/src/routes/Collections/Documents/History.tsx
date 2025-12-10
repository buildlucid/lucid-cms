import T from "@/translations";
import { type Component, For, Show, Switch, Match, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useHistoryState } from "@/hooks/document/useHistoryState";
import { useHistoryUIState } from "@/hooks/document/useHistoryUIState";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Link from "@/components/Partials/Link";
import { getDocumentRoute } from "@/utils/route-helpers";
import notifySvg from "@assets/illustrations/notify.svg";
import type { DocumentVersionResponse } from "@types";

const CollectionsDocumentsHistoryRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const state = useHistoryState();
	const uiState = useHistoryUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
	});

	// ----------------------------------
	// Handlers
	const navigateToRevision = (revisionId: number) => {
		navigate(
			`/admin/collections/${state.collectionKey()}/revision/${state.documentId()}/${revisionId}`,
		);
	};

	// ----------------------------------
	// Memos
	const latestRevisionId = createMemo(() => {
		const revisions = state.accumulatedRevisions();
		return revisions.length > 0 ? revisions[0].id : null;
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
					<div class="p-6 pl-20 relative before:absolute before:left-20 before:top-0 before:bottom-0 before:w-0.5 before:bg-secondary-base/20 before:z-0">
						<For each={state.groupedRevisions()}>
							{(group) => (
								<div class="mb-4 last:mb-0 ml-4">
									<div class="mb-4">
										<span class="inline-block px-2 py-1 text-xs font-medium text-secondary-contrast bg-secondary-base rounded-full -ml-4 -translate-x-1/2">
											{group.dateLabel}
										</span>
									</div>
									<div class="space-y-3">
										<For each={group.revisions}>
											{(revision) => (
												<RevisionCard
													revision={revision}
													isLatest={revision.id === latestRevisionId()}
													onClick={() => navigateToRevision(revision.id)}
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
			</Match>
		</Switch>
	);
};

// ----------------------------------
// Revision Card Component
const RevisionCard: Component<{
	revision: DocumentVersionResponse;
	isLatest: boolean;
	onClick: () => void;
}> = (props) => {
	return (
		<button
			type="button"
			class="group flex max-w-82 w-full text-left bg-card-base border border-border rounded-lg p-4 hover:border-primary-base/50 hover:bg-card-hover transition-colors duration-200 focus-visible:ring-1 focus:ring-primary-base outline-none"
			onClick={props.onClick}
		>
			<div class="flex flex-col gap-2">
				<div class="min-w-0 flex-1">
					<h3 class="text-sm font-medium text-title">
						<Show
							when={props.isLatest}
							fallback={`${T()("revision")} #${props.revision.id}`}
						>
							{T()("latest_revision")}
						</Show>
					</h3>
					<DateText date={props.revision.createdAt} class="text-body text-xs" />
				</div>
				<div class="flex items-center gap-2 flex-shrink-0">
					<Pill theme="outline">
						{props.revision.bricks?.builder?.length ?? 0} {T()("bricks")}
					</Pill>
					<Pill theme="outline">
						{props.revision.bricks?.fixed?.length ?? 0} {T()("fixed_bricks")}
					</Pill>
				</div>
			</div>
		</button>
	);
};

export default CollectionsDocumentsHistoryRoute;
