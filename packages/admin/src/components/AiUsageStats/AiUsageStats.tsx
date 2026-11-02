import classnames from "classnames";
import { type Component, For, Show } from "solid-js";

export interface AiUsageStat {
	label: string;
	value?: string;
	accent?: string;
}

/** Totals as a strip along the bottom of a card with `padding="none"`. An `accent` adds a coloured dot, such as the charted metric's line colour. */
const AiUsageStats: Component<{ stats: AiUsageStat[]; class?: string }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<dl
			class={classnames(
				"grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4",
				props.class,
			)}
		>
			<For each={props.stats}>
				{(stat) => (
					<div class="flex min-w-0 flex-col gap-0.5 bg-card px-5 py-3">
						<dt class="flex items-center gap-1.5 text-xs text-muted">
							<Show when={stat.accent}>
								{(accent) => (
									<span
										class="size-1.5 shrink-0 rounded-full"
										style={{ "background-color": accent() }}
									/>
								)}
							</Show>
							{stat.label}
						</dt>
						<dd class="truncate text-sm font-medium text-title tabular-nums">
							{stat.value ?? "-"}
						</dd>
					</div>
				)}
			</For>
		</dl>
	);
};

export default AiUsageStats;
