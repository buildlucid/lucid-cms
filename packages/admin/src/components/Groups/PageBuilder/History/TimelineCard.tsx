import T from "@/translations";
import { type Component, Show, Switch, Match, createMemo, For } from "solid-js";
import type {
	TimelineItem,
	UseHistoryState,
	TimelineCardType,
} from "@/hooks/document/useHistoryState";
import DateText from "@/components/Partials/DateText";
import Pill from "@/components/Partials/Pill";
import classNames from "classnames";

const TimelineCardWrapper: Component<{
	item: TimelineItem;
	state: UseHistoryState;
	level: number;
	parentType?: TimelineCardType;
	isLastSibling?: boolean;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isSelected = createMemo(() => props.state.isItemSelected(props.item));

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames("relative flex flex-col", {
				"mb-3 last:mb-0": props.level > 0,
			})}
		>
			{/* latest / revision */}
			<Switch>
				<Match when={props.item.type === "latest"}>
					<TimelineCard
						item={props.item}
						parentType={props.parentType}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
					/>
				</Match>
				<Match when={props.item.type === "revision"}>
					<TimelineCard
						item={props.item}
						parentType={props.parentType}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
					/>
				</Match>
				<Match when={props.item.type === "environment"}>
					<TimelineCard
						item={props.item}
						parentType={props.parentType}
						isSelected={isSelected()}
						onClick={() => props.state.handleSelectItem(props.item)}
						isLastSibling={props.isLastSibling}
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
				<div class="relative mt-3 ml-1 pl-7 space-y-3">
					<For each={props.item.environmentVersions}>
						{(envItem, index) => (
							<TimelineCardWrapper
								item={envItem}
								state={props.state}
								level={1}
								parentType={props.item.type}
								isLastSibling={
									index() === (props.item.environmentVersions?.length ?? 0) - 1
								}
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
	parentType?: TimelineCardType;
	isSelected: boolean;
	onClick: () => void;
	isLastSibling?: boolean;
}> = (props) => {
	// ----------------------------------
	// Memos
	const isUnreleasedEnvironment = createMemo(() => {
		return (
			props.item.type === "environment" &&
			props.item.releaseStatus === "not_released"
		);
	});
	const isEnvironmentUpToDate = createMemo(() => {
		return (
			props.item.type === "environment" &&
			props.item.releaseStatus === "released" &&
			props.item.upToDate === true
		);
	});
	const showOutOfSyncPill = createMemo(() => {
		if (props.item.type !== "environment") return false;
		if (props.item.releaseStatus !== "released") return false;
		if (props.item.upToDate === true) return false;

		if (!props.parentType) return true;
		if (props.parentType === "latest") return true;
		return false;
	});
	const environmentStatusLabel = createMemo(() => {
		if (props.item.type !== "environment") return null;
		if (isUnreleasedEnvironment()) return "Unreleased";
		if (isEnvironmentUpToDate()) return "Synced";
		if (showOutOfSyncPill()) return "Out of sync";
		return null;
	});

	// ----------------------------------
	// Render
	return (
		<>
			<Show when={props.item.type === "environment"}>
				<span
					class={classNames(
						"absolute -left-4 -top-2.5 border-l border-dashed border-secondary-base/40",
						{
							"bottom-0": !props.isLastSibling,
							"bottom-1/2": props.isLastSibling,
						},
					)}
				/>
			</Show>
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
					class={classNames(
						"group relative flex max-w-72 w-full text-left overflow-hidden rounded-md border border-border p-4 transition-colors duration-200 outline-none bg-card-base focus-visible:ring-1 focus-visible:ring-primary-base",
						{
							"hover:bg-card-hover": !isUnreleasedEnvironment(),
							"opacity-70 cursor-not-allowed": isUnreleasedEnvironment(),
						},
					)}
					onClick={() => {
						if (isUnreleasedEnvironment()) return;
						props.onClick();
					}}
				>
					<span
						class={classNames(
							"absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r",
							{
								"from-primary-base/60 to-primary-base/20":
									props.item.type === "latest" || isEnvironmentUpToDate(),
								"from-warning-base/60 to-warning-base/20":
									props.item.type === "environment" &&
									!isUnreleasedEnvironment() &&
									!isEnvironmentUpToDate(),
								"from-error-base/60 to-error-base/20":
									isUnreleasedEnvironment(),
							},
						)}
					/>

					<div class="flex items-start justify-between gap-3 w-full">
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<h3 class="text-sm font-semibold text-title truncate capitalize">
									<Switch>
										<Match when={props.item.type === "latest"}>
											{T()("latest")}
										</Match>
										<Match when={props.item.type === "environment"}>
											{props.item.version}
										</Match>
										<Match when={props.item.type === "revision"}>
											{T()("revision")} #{props.item.id}
										</Match>
									</Switch>
								</h3>
								<Show when={props.item.type === "environment"}>
									<Show when={environmentStatusLabel()}>
										{(label) => (
											<Pill
												theme={
													isUnreleasedEnvironment()
														? "error-opaque"
														: isEnvironmentUpToDate()
															? "primary-opaque"
															: "warning-opaque"
												}
											>
												{label()}
											</Pill>
										)}
									</Show>
								</Show>
							</div>
							<div class="mt-1 flex items-center gap-2 text-sm text-body">
								<DateText date={props.item.createdAt} class="text-body" />
							</div>
						</div>
					</div>
				</button>
			</div>
		</>
	);
};

export default TimelineCardWrapper;
