import { useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import { PageBuilderHeader } from "@/components/PageBuilderHeader/PageBuilderHeader";
import RestoreRevisionModal from "@/components/RestoreRevisionModal/RestoreRevisionModal";
import { useAgentScreen } from "@/hooks/useAgentScreen/useAgentScreen";
import { useDocumentHistoryState } from "@/hooks/useDocumentHistoryState/useDocumentHistoryState";
import { useDocumentHistoryUIState } from "@/hooks/useDocumentHistoryUIState/useDocumentHistoryUIState";
import { createDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import T from "@/translations";
import { screenLabel } from "@/utils/agent-screen";
import { getDocumentPreviewLabel } from "@/utils/document-table-helpers";
import { tabId } from "@/utils/tab-id";
import TimelineCardWrapper from "./parts/TimelineCard";
import TimelineDetails from "./parts/TimelineDetails";

const DocumentHistoryPage: Component = () => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const state = useDocumentHistoryState();
	const uiState = useDocumentHistoryUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
	});
	const { contentLocale } = createDocumentLocalization(state.collection);

	// ----------------------------------
	// Memos
	const documentLabel = createMemo(() => {
		const document = state.document();
		return document
			? getDocumentPreviewLabel({
					collection: state.collection(),
					document,
					contentLocale: contentLocale() ?? "",
				})
			: undefined;
	});

	// ----------------------------------
	// Effects
	usePageTitle(() => {
		const subject = documentLabel() ?? state.collectionName();
		return subject ? `${T()("common.history")} · ${subject}` : undefined;
	});
	//* the agent reads the selected version itself, so the screen only names it
	useAgentScreen(() => {
		const label = documentLabel();
		const documentId = state.documentId();
		if (label === undefined || documentId === undefined) return undefined;
		return {
			type: "history",
			tabId,
			label: screenLabel(`${T()("common.history")} · ${label}`),
			collectionKey: state.collectionKey(),
			documentId,
			versionId: state.selectedItem()?.id ?? null,
		};
	});

	//* Redirect out of the history view when the document/collection isn't available.
	createEffect(() => {
		if (state.collectionAccessError()) {
			navigate("/admin", { replace: true });
			return;
		}
		if (state.documentAccessError()) {
			if (state.collection()?.mode === "multiple") {
				navigate(`/admin/collections/${state.collectionKey()}`, {
					replace: true,
				});
				return;
			}
			navigate("/admin", { replace: true });
		}
	});

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match
				when={state.isLoading() && state.searchParams.pagination().page === 1}
			>
				<span class="absolute top-0 left-0 md:left-55 right-4 h-32 bg-background-hover z-5" />
				<div class="fixed top-4 left-4 md:left-55 bottom-4 right-4 flex flex-col z-10">
					<span class="h-32 w-full skeleton block mb-4" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={state.isSuccess()}>
				<PageBuilderHeader
					mode={undefined}
					trailingBreadcrumbs={() => [
						{
							label: T()("common.history"),
						},
					]}
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
				<div class="flex flex-col lg:flex-row gap-10 items-start mt-2 bg-background dotted-background rounded-t-xl border border-border grow">
					<div class="w-full lg:w-182 p-6 pl-12 md:pl-20 relative before:absolute before:left-12 md:before:left-20 before:top-0 before:bottom-0 before:w-0.5 before:bg-secondary/20 before:z-0 before:-translate-x-1/2 h-full">
						<For each={state.timelineData()}>
							{(group) => (
								<div class="mb-6 last:mb-0 ml-4">
									<div class="mb-4">
										<span class="inline-block px-2 py-1 text-xs font-medium text-secondary-foreground bg-secondary rounded-full -ml-8 md:-ml-4 md:-translate-x-1/2">
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
							<div class="mt-6 ml-4">
								<Button
									variant="outline"
									size="sm"
									onClick={state.loadMore}
									loading={state.isLoading()}
									class="w-full"
								>
									{T()("common.load.more")}
								</Button>
							</div>
						</Show>
					</div>
					<div
						class="w-full z-10 sticky top-0"
						style={{ top: "var(--document-header-bar-height, 100px)" }}
					>
						<Show when={state.selectedItem()}>
							{(item) => (
								<TimelineDetails
									item={item()}
									revisionName={state.revisionName()}
									onRevisionNameChange={state.setRevisionName}
									onRestore={state.handleRestoreRevision}
									restore={{
										loading: state.restoreRevision.action.isPending,
										permission: state.restorePermission(),
									}}
									collection={state.collection}
									document={state.document}
									selectedVersionDocument={state.selectedVersionDocument}
									selectedVersionDocumentLoading={() =>
										state.selectedVersionDocumentQuery.isLoading
									}
									createdByUser={state.selectedCreatedByUser}
									createdByAgent={state.selectedCreatedByAgent}
									retention={state.selectedRetention}
									requests={() => state.requestsQuery.data?.data ?? []}
									requestsLoading={() => state.requestsQuery.isLoading}
								/>
							)}
						</Show>
					</div>
				</div>
				<RestoreRevisionModal
					versionId={() => state.selectedItem()?.id ?? null}
					state={{
						open: state.restoreRevisionOpen(),
						setOpen: state.setRestoreRevisionOpen,
					}}
					loading={state.restoreRevision.action.isPending}
					error={state.restoreRevision.errors()?.message}
					callbacks={{
						onConfirm: state.confirmRestoreRevision,
						onCancel: state.cancelRestoreRevision,
					}}
				/>
			</Match>
		</Switch>
	);
};

export default DocumentHistoryPage;
