import classnames from "classnames";
import { type Component, For, Show } from "solid-js";

export interface AiUsageStat {
	label: string;
	value?: string;
	accent?: string;
}

const AiUsageStats: Component<{ stats: AiUsageStat[]; class?: string }> = (
	props,
) => {
	// ----------------------------------------
	// Render
	return (
		<dl
			class={classnames(
				"grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4",
				props.class,
			)}
		>
			<For each={props.stats}>
				{(stat) => (
					<div class="flex min-w-0 flex-col gap-0.5 bg-card px-3 py-2">
						<dt class="flex items-center gap-1.5 text-[11px] leading-4 text-muted">
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
						<dd class="truncate text-sm text-title tabular-nums">
							{stat.value ?? "-"}
						</dd>
					</div>
				)}
			</For>
		</dl>
	);
};

export default AiUsageStats;
