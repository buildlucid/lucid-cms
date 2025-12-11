import T from "@/translations";
import { type Component, Show, Switch, Match, createMemo, For } from "solid-js";
import type {
	TimelineItem,
	UseHistoryState,
} from "@/hooks/document/useHistoryState";
import DateText from "@/components/Partials/DateText";
import classNames from "classnames";

const TimelineCardWrapper: Component<{
	item: TimelineItem;
	state: UseHistoryState;
	level: number;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isSelected = createMemo(() => props.state.isItemSelected(props.item));

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
					/>
				</Match>
				<Match when={props.item.type === "revision"}>
					<TimelineCard
						item={props.item}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
					/>
				</Match>
				<Match when={props.item.type === "environment"}>
					<TimelineCard
						item={props.item}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
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
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div class="relative">
			<span
				class={classNames(
					"absolute -left-4 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200",
					{
						"border-primary-base/70 bg-primary-base/10": props.isSelected,
						"border-secondary-base/60 bg-background-base": !props.isSelected,
					},
				)}
			/>
			<span
				class={classNames(
					"absolute -left-4 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full transition-colors duration-200",
					{
						"bg-primary-base": props.isSelected,
						"bg-secondary-base": !props.isSelected,
					},
				)}
			/>
			<button
				type="button"
				class="group relative flex max-w-72 w-full text-left overflow-hidden rounded-md border border-border p-4 transition-colors duration-200 outline-none bg-card-base hover:bg-card-hover focus-visible:ring-1 focus-visible:ring-primary-base"
				onClick={props.onClick}
			>
				<span
					class={classNames("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", {
						"from-primary-base/60 to-primary-base/20":
							props.item.type === "latest",
						"from-warning-base/60 to-warning-base/20":
							props.item.type === "environment",
						"from-info-base/60 to-info-base/20": props.item.type === "revision",
					})}
				/>

				<div class="flex items-start justify-between gap-3 w-full">
					<div class="min-w-0 flex-1">
						<h3 class="text-sm font-semibold text-title truncate">
							<Switch>
								<Match when={props.item.type === "latest"}>
									{T()("latest_revision")}
								</Match>
								<Match when={props.item.type === "environment"}>
									{T()("environment_version", {
										version: `${props.item.version?.charAt(0).toUpperCase()}${props.item.version?.slice(1)}`,
									})}
								</Match>
								<Match when={props.item.type === "revision"}>
									{T()("revision")} #{props.item.id}
								</Match>
							</Switch>
						</h3>
						<div class="mt-1 flex items-center gap-2 text-sm text-body">
							<DateText date={props.item.createdAt} class="text-body" />
						</div>
					</div>
				</div>
			</button>
		</div>
	);
};

export default TimelineCardWrapper;
