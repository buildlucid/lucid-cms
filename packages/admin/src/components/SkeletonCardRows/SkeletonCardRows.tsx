import classnames from "classnames";
import { type Component, Index, Show } from "solid-js";

export interface SkeletonCardRowsProps {
	/** @default 2 */
	count?: number;
	/** `card` stacks bordered cards, as in drawers. `row` divides rows that fill an `InfoRow.Content` with `padding="none"`. @default "card" */
	variant?: "card" | "row";
}

/** Placeholder rows for lists like integrations, OAuth applications and OAuth connections: a round icon, a name and a summary. Cards add a meta line. */
const SkeletonCardRows: Component<SkeletonCardRowsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames({
				"flex flex-col gap-3": props.variant !== "row",
				"divide-y divide-border": props.variant === "row",
			})}
		>
			<Index each={Array.from({ length: props.count ?? 2 })}>
				{() => (
					<div
						class={classnames("flex", {
							"items-start gap-3 rounded-lg border border-border bg-input p-2":
								props.variant !== "row",
							"items-center gap-4 px-5 py-4": props.variant === "row",
						})}
					>
						<span class="skeleton block size-10 shrink-0 rounded-full" />
						<div class="min-w-0 grow">
							<div class="text-sm">
								<span class="skeleton block w-40 max-w-full">&nbsp;</span>
							</div>
							<div
								class={classnames("text-xs", {
									"mt-0.5": props.variant !== "row",
									"mt-1": props.variant === "row",
								})}
							>
								<span class="skeleton block w-64 max-w-full">&nbsp;</span>
							</div>
							<Show when={props.variant !== "row"}>
								<div class="mt-2 text-xs">
									<span class="skeleton block w-32">&nbsp;</span>
								</div>
							</Show>
						</div>
					</div>
				)}
			</Index>
		</div>
	);
};

export default SkeletonCardRows;
