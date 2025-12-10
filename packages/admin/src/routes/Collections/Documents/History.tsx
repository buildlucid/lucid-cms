import T from "@/translations";
import {
	type Component,
	For,
	Show,
	Switch,
	Match,
	createMemo,
	createSignal,
	createEffect,
} from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useHistoryState } from "@/hooks/document/useHistoryState";
import { useHistoryUIState } from "@/hooks/document/useHistoryUIState";
import { HeaderBar } from "@/components/Groups/PageBuilder";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import Button from "@/components/Partials/Button";
import type { DocumentVersionResponse } from "@types";
import classNames from "classnames";

// ----------------------------------
// Types
type VersionType = "latest" | "revision" | "environment";

interface TimelineItem {
	type: VersionType;
	id: number;
	version?: string;
	createdAt: string | null;
	createdBy: number | null;
	promotedFrom: number | null;
	contentId: string;
	bricks?: DocumentVersionResponse["bricks"];
	environmentVersions?: TimelineItem[];
}

interface TimelineGroup {
	dateLabel: string;
	items: TimelineItem[];
}

// ----------------------------------
// Helper Functions
const getDateGroupKey = (dateStr: string | null): string => {
	if (!dateStr) return "Unknown";

	const date = new Date(dateStr);
	const now = new Date();
	const diffTime = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays} days ago`;

	return date.toLocaleDateString("en-gb", {
		day: "numeric",
		month: "long",
	});
};

// ----------------------------------
// Main Component
const CollectionsDocumentsHistoryRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const navigate = useNavigate();
	const state = useHistoryState();
	const uiState = useHistoryUIState({
		collectionQuery: state.collectionQuery,
		collection: state.collection,
	});

	const [selectedItem, setSelectedItem] = createSignal<TimelineItem | null>(
		null,
	);
	const [revisionName, setRevisionName] = createSignal("");

	// ----------------------------------
	// Handlers
	const navigateToRevision = (revisionId: number) => {
		navigate(
			`/admin/collections/${state.collectionKey()}/revision/${state.documentId()}/${revisionId}`,
		);
	};

	const handleSelectItem = (item: TimelineItem) => {
		setSelectedItem(item);
		setRevisionName("");
	};

	const handleRestoreRevision = () => {
		// TODO: Implement restore revision functionality
		console.log("Restore revision:", selectedItem());
	};

	const handlePromoteToEnvironment = () => {
		// TODO: Implement promote to environment functionality
		console.log("Promote to environment:", selectedItem());
	};

	// ----------------------------------
	// Memos
	const timelineData = createMemo((): TimelineGroup[] => {
		const document = state.document();
		const revisions = state.accumulatedRevisions();
		const allItems: TimelineItem[] = [];

		//* add latest version
		if (document?.version?.latest) {
			const latest = document.version.latest;
			allItems.push({
				type: "latest",
				id: latest.id,
				version: "latest",
				createdAt: latest.createdAt,
				createdBy: latest.createdBy,
				promotedFrom: latest.promotedFrom,
				contentId: latest.contentId,
			});
		}

		//* add revisions
		for (const revision of revisions) {
			allItems.push({
				type: "revision",
				id: revision.id,
				createdAt: revision.createdAt,
				createdBy: revision.createdBy,
				promotedFrom: revision.promotedFrom,
				contentId: revision.contentId,
				bricks: revision.bricks,
			});
		}

		//* collect environment versions
		const environmentVersions: TimelineItem[] = [];
		if (document?.version) {
			for (const [key, version] of Object.entries(document.version)) {
				if (key !== "latest" && version) {
					environmentVersions.push({
						type: "environment",
						id: version.id,
						version: key,
						createdAt: version.createdAt,
						createdBy: version.createdBy,
						promotedFrom: version.promotedFrom,
						contentId: version.contentId,
					});
				}
			}
		}

		//* link environment versions to their source
		const contentIdMap = new Map<string, TimelineItem>();
		const idMap = new Map<number, TimelineItem>();

		for (const item of allItems) {
			contentIdMap.set(item.contentId, item);
			idMap.set(item.id, item);
		}

		//* attach environment versions to their sources
		for (const envVersion of environmentVersions) {
			let sourceItem: TimelineItem | undefined;

			if (envVersion.promotedFrom) {
				sourceItem = idMap.get(envVersion.promotedFrom);
			}

			if (!sourceItem && envVersion.contentId) {
				sourceItem = contentIdMap.get(envVersion.contentId);
			}

			if (sourceItem) {
				if (!sourceItem.environmentVersions) {
					sourceItem.environmentVersions = [];
				}
				sourceItem.environmentVersions.push(envVersion);
			} else {
				allItems.push(envVersion);
			}
		}

		//* sort all items by date
		allItems.sort((a, b) => {
			if (!a.createdAt) return 1;
			if (!b.createdAt) return -1;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});

		//* group by date
		const groups: Map<string, TimelineItem[]> = new Map();

		for (const item of allItems) {
			const dateKey = getDateGroupKey(item.createdAt);
			const existing = groups.get(dateKey) || [];
			groups.set(dateKey, [...existing, item]);
		}

		return Array.from(groups.entries()).map(([dateLabel, items]) => ({
			dateLabel,
			items,
		}));
	});

	const isItemSelected = (item: TimelineItem): boolean => {
		const selected = selectedItem();
		if (!selected) return false;
		return selected.id === item.id && selected.type === item.type;
	};

	createEffect(() => {
		const data = timelineData();
		if (data.length > 0 && data[0].items.length > 0 && !selectedItem()) {
			setSelectedItem(data[0].items[0]);
		}
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
						<For each={timelineData()}>
							{(group) => (
								<div class="mb-6 last:mb-0 ml-4">
									<div class="mb-4">
										<span class="inline-block px-2 py-1 text-xs font-medium text-secondary-contrast bg-secondary-base rounded-full -ml-4 -translate-x-1/2">
											{group.dateLabel}
										</span>
									</div>
									<div class="space-y-3">
										<For each={group.items}>
											{(item) => {
												const selected = isItemSelected(item);
												return (
													<div class="relative flex flex-col pl-3">
														{/* timeline dot */}
														<div
															class={classNames(
																"absolute -left-3.5 top-4 w-3 h-3 rounded-full border-2 -translate-x-1/2",
																{
																	"border-primary-base bg-primary-base":
																		selected,
																	"border-secondary-base bg-background-base":
																		!selected,
																},
															)}
														/>

														<TimelineCard
															item={item}
															isSelected={selected}
															onClick={() => handleSelectItem(item)}
															onQuickView={() => navigateToRevision(item.id)}
														/>
														<Show
															when={
																item.environmentVersions &&
																item.environmentVersions.length > 0
															}
														>
															<div class="relative mt-3 ml-1 pl-7">
																{/* branch connector */}
																<div class="absolute left-2 top-0 bottom-6 border-l border-dashed border-secondary-base/40" />
																<For each={item.environmentVersions}>
																	{(envItem) => {
																		const envSelected = isItemSelected(envItem);
																		return (
																			<div class="relative mb-2 last:mb-0">
																				<div
																					class={classNames(
																						"absolute -left-[7px] top-3 w-3 h-3 rounded-full shadow-[0_0_0_3px_rgba(10,10,10,0.95)]",
																						{
																							"bg-primary-base": envSelected,
																							"bg-secondary-base": !envSelected,
																						},
																					)}
																				/>
																				<EnvironmentCard
																					item={envItem}
																					isSelected={envSelected}
																					onClick={() =>
																						handleSelectItem(envItem)
																					}
																					onQuickView={() =>
																						navigateToRevision(envItem.id)
																					}
																				/>
																			</div>
																		);
																	}}
																</For>
															</div>
														</Show>
													</div>
												);
											}}
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
						<Show when={selectedItem()}>
							{(item) => (
								<DetailsPanel
									item={item()}
									revisionName={revisionName()}
									onRevisionNameChange={setRevisionName}
									onRestore={handleRestoreRevision}
									onPromote={handlePromoteToEnvironment}
									onNavigate={navigateToRevision}
									collection={state.collection()}
								/>
							)}
						</Show>
					</div>
				</div>
			</Match>
		</Switch>
	);
};

// ----------------------------------
// Timeline Card Component
const TimelineCard: Component<{
	item: TimelineItem;
	isSelected: boolean;
	onClick: () => void;
	onQuickView?: () => void;
}> = (props) => {
	const isLatest = () => props.item.type === "latest";
	const isRevision = () => props.item.type === "revision";

	return (
		<button
			type="button"
			class="group relative flex max-w-72 w-full text-left bg-card-base/95 border border-border/60 rounded-lg px-4 py-3 transition-colors duration-200 outline-none hover:bg-card-hover/80 focus-visible:ring-1 focus:ring-primary-base"
			onClick={props.onClick}
		>
			<div class="flex flex-col gap-1 w-full">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0 flex-1">
						<Show when={isLatest()}>
							<div class="flex items-center gap-2">
								<Pill theme="primary" class="text-[10px]">
									{T()("latest_revision")}
								</Pill>
							</div>
						</Show>
						<Show when={isRevision()}>
							<h3 class="text-sm font-medium text-title">
								{T()("revision")} #{props.item.id}
							</h3>
						</Show>
						<Show when={isLatest()}>
							<DateText
								date={props.item.createdAt}
								class="text-body text-xs mt-1"
							/>
						</Show>
					</div>
					<div class="flex items-center gap-1 flex-shrink-0">
						<Show when={isLatest() && props.onQuickView}>
							<button
								type="button"
								class="inline-flex items-center justify-center rounded-md p-1.5 text-[10px] text-body/80 bg-background-base/60 border border-border/60 hover:bg-background-hover hover:text-primary-base transition-colors"
								onClick={(e) => {
									e.stopPropagation();
									props.onQuickView?.();
								}}
								title={T()("view")}
							>
								<svg
									class="w-3 h-3"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							</button>
						</Show>
					</div>
				</div>
			</div>
		</button>
	);
};

// ----------------------------------
// Environment Card Component
const EnvironmentCard: Component<{
	item: TimelineItem;
	isSelected: boolean;
	onClick: () => void;
	onQuickView?: () => void;
}> = (props) => {
	return (
		<button
			type="button"
			class="group flex max-w-72 w-full text-left bg-card-base/95 border border-border/60 rounded-lg px-4 py-2.5 transition-colors duration-200 outline-none hover:bg-card-hover/80 focus-visible:ring-1 focus:ring-primary-base"
			onClick={props.onClick}
		>
			<div class="flex items-center justify-between gap-2 w-full">
				<div class="flex items-center gap-2 min-w-0 flex-1">
					<Pill theme="secondary" class="text-[10px] capitalize">
						{props.item.version}
					</Pill>
					<DateText date={props.item.createdAt} class="text-body text-xs" />
				</div>
				<div class="flex items-center gap-1 flex-shrink-0">
					<Show when={props.onQuickView}>
						<button
							type="button"
							class="inline-flex items-center justify-center rounded-md p-1.5 text-[10px] text-body/80 bg-background-base/60 border border-border/60 hover:bg-background-hover hover:text-secondary-base transition-colors"
							onClick={(e) => {
								e.stopPropagation();
								props.onQuickView?.();
							}}
							title={T()("view")}
						>
							<svg
								class="w-3 h-3"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/>
							</svg>
						</button>
					</Show>
				</div>
			</div>
		</button>
	);
};

// ----------------------------------
// Details Panel Component
const DetailsPanel: Component<{
	item: TimelineItem;
	revisionName: string;
	onRevisionNameChange: (value: string) => void;
	onRestore: () => void;
	onPromote: () => void;
	onNavigate: (id: number) => void;
	collection: ReturnType<
		typeof useHistoryState
	>["collection"] extends () => infer R
		? R
		: never;
}> = (props) => {
	const getTitle = () => {
		switch (props.item.type) {
			case "latest":
				return T()("latest_revision");
			case "environment":
				return `${props.item.version?.charAt(0).toUpperCase()}${props.item.version?.slice(1)} Version`;
			default:
				return `${T()("revision")} #${props.item.id}`;
		}
	};

	const environments = createMemo(() => {
		return props.collection?.config?.environments ?? [];
	});

	return (
		<div class="space-y-5">
			<div>
				<div class="flex items-center gap-2 mb-1">
					<Show when={props.item.type === "latest"}>
						<Pill theme="primary" class="text-[10px]">
							{T()("latest_revision")}
						</Pill>
					</Show>
					<Show when={props.item.type === "environment"}>
						<Pill theme="secondary" class="text-[10px] capitalize">
							{props.item.version}
						</Pill>
					</Show>
					<Show when={props.item.type === "revision"}>
						<Pill theme="outline" class="text-[10px]">
							Revision
						</Pill>
					</Show>
				</div>
				<h3 class="text-lg font-semibold text-title">{getTitle()}</h3>
			</div>
			<div class="space-y-3">
				<div>
					<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
						Version ID
					</span>
					<p class="text-sm text-title mt-0.5">#{props.item.id}</p>
				</div>
				<div>
					<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
						{T()("created_at")}
					</span>
					<DateText
						date={props.item.createdAt}
						class="text-sm text-title block mt-0.5"
					/>
				</div>
				<Show when={props.item.contentId}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Content ID
						</span>
						<p class="text-title mt-0.5 font-mono text-xs break-all">
							{props.item.contentId}
						</p>
					</div>
				</Show>
				<Show when={props.item.promotedFrom}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Promoted From
						</span>
						<p class="text-sm text-title mt-0.5">
							Revision #{props.item.promotedFrom}
						</p>
					</div>
				</Show>
				<Show when={props.item.bricks}>
					<div>
						<span class="text-xs font-medium text-unfocused uppercase tracking-wide block">
							Content
						</span>
						<div class="flex items-center gap-2 mt-1">
							<Pill theme="outline">
								{props.item.bricks?.builder?.length ?? 0} {T()("bricks")}
							</Pill>
							<Pill theme="outline">
								{props.item.bricks?.fixed?.length ?? 0} {T()("fixed_bricks")}
							</Pill>
						</div>
					</div>
				</Show>
			</div>
			<div class="border-t border-border" />
			<div>
				<label
					for="revision-name"
					class="text-xs font-medium text-unfocused uppercase tracking-wide block mb-1.5"
				>
					Revision Name
				</label>
				<input
					id="revision-name"
					type="text"
					class="w-full px-3 py-2 text-sm text-title bg-input-base border border-border rounded-md focus:outline-none focus:border-primary-base transition-colors duration-200"
					placeholder="Enter a name for this revision..."
					value={props.revisionName}
					onInput={(e) => props.onRevisionNameChange(e.currentTarget.value)}
				/>
				<p class="text-xs text-body mt-1">
					Add a memorable name to easily identify this revision
				</p>
			</div>
			<div class="space-y-2 pt-2">
				<Button
					theme="border-outline"
					size="medium"
					classes="w-full"
					onClick={() => props.onNavigate(props.item.id)}
				>
					<svg
						class="w-4 h-4 mr-2"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
						/>
					</svg>
					{T()("view")} Revision
				</Button>
				<Show when={props.item.type === "revision"}>
					<Button
						theme="secondary"
						size="medium"
						classes="w-full"
						onClick={props.onRestore}
					>
						<svg
							class="w-4 h-4 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						{T()("restore_revision")}
					</Button>
				</Show>
				<Show when={environments().length > 0}>
					<div class="relative">
						<Button
							theme="primary"
							size="medium"
							classes="w-full"
							onClick={props.onPromote}
						>
							<svg
								class="w-4 h-4 mr-2"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
								/>
							</svg>
							Promote to Environment
						</Button>
					</div>
				</Show>
			</div>
		</div>
	);
};

export default CollectionsDocumentsHistoryRoute;
