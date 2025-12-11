import T from "@/translations";
import { type Component, Show, Switch, Match, createMemo, For } from "solid-js";
import type {
	TimelineItem,
	UseHistoryState,
} from "@/hooks/document/useHistoryState";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import classNames from "classnames";
import { useNavigate } from "@solidjs/router";
import { getDocumentRoute } from "@/utils/route-helpers";

const TimelineCardWrapper: Component<{
	item: TimelineItem;
	state: UseHistoryState;
	level: number;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const navigate = useNavigate();

	// ----------------------------------
	// Memos
	const isSelected = createMemo(() => props.state.isItemSelected(props.item));

	// ----------------------------------
	// Handlers
	const navigateToRevision = (item: TimelineItem) => {
		navigate(
			getDocumentRoute("edit", {
				collectionKey: props.state.collectionKey(),
				documentId: props.state.documentId(),
				status: item.version,
			}),
		);
	};

	// ----------------------------------
	// Render
	return (
		<div class="relative flex flex-col">
			{/* latest / revision */}
			<Switch>
				<Match when={props.item.type === "latest"}>
					<TimelineCard
						item={props.item}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
						navigate={navigateToRevision}
					/>
				</Match>
				<Match when={props.item.type === "revision"}>
					<TimelineCard
						item={props.item}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
						navigate={navigateToRevision}
					/>
				</Match>
				<Match when={props.item.type === "environment"}>
					<TimelineCard
						item={props.item}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
						navigate={navigateToRevision}
					/>
				</Match>
			</Switch>

			{/* envionments */}
			<Show
				when={
					props.item.environmentVersions &&
					props.item.environmentVersions.length > 0
				}
			>
				<div class="relative mt-3 ml-1 pl-7">
					<span class="absolute left-3 top-0 bottom-1/2 border-l border-dashed border-secondary-base/40" />
					<For each={props.item.environmentVersions}>
						{(envItem) => (
							<TimelineCardWrapper
								item={envItem}
								state={props.state}
								level={1}
							/>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
};

const TimelineCard: Component<{
	item: TimelineItem;
	isSelected: boolean;
	onClick: () => void;
	navigate?: (item: TimelineItem) => void;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div class="relative">
			<span
				class={classNames(
					"absolute -left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border -translate-x-1/2",
					{
						"border-primary-base bg-primary-base": props.isSelected,
						"border-secondary-base bg-background-base": !props.isSelected,
					},
				)}
			/>
			<Switch>
				<Match when={props.item.type === "latest"}>
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
								<DateText
									date={props.item.createdAt}
									class="text-body text-xs"
								/>
							</div>
							<div class="flex items-center gap-1 flex-shrink-0">
								<Show when={props.navigate}>
									<button
										type="button"
										class="inline-flex items-center justify-center rounded-md p-1.5 text-[10px] text-body/80 bg-background-base/60 border border-border/60 hover:bg-background-hover hover:text-secondary-base transition-colors"
										onClick={(e) => {
											e.stopPropagation();
											props.navigate?.(props.item);
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
				</Match>
				<Match when={props.item.type === "revision"}>
					<button
						type="button"
						class="group relative flex max-w-72 w-full text-left bg-card-base/95 border border-border/60 rounded-lg px-4 py-3 transition-colors duration-200 outline-none hover:bg-card-hover/80 focus-visible:ring-1 focus:ring-primary-base"
						onClick={props.onClick}
					>
						<div class="flex flex-col gap-1 w-full">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<h3 class="text-sm font-medium text-title">
										{T()("revision")} #{props.item.id}
									</h3>
								</div>
							</div>
						</div>
					</button>
				</Match>
				<Match when={props.item.type === "environment"}>
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
								<DateText
									date={props.item.createdAt}
									class="text-body text-xs"
								/>
							</div>
							<div class="flex items-center gap-1 flex-shrink-0">
								<Show when={props.navigate}>
									<button
										type="button"
										class="inline-flex items-center justify-center rounded-md p-1.5 text-[10px] text-body/80 bg-background-base/60 border border-border/60 hover:bg-background-hover hover:text-secondary-base transition-colors"
										onClick={(e) => {
											e.stopPropagation();
											props.navigate?.(props.item);
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
				</Match>
			</Switch>
		</div>
	);
};

export default TimelineCardWrapper;
