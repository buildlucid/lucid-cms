import { TbOutlineChevronDown, TbOutlineTool } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import T from "@/translations";
import { groupTools } from "@/utils/agent-tools";

interface ToolGroupsRevealProps {
	/** Tool names, like `documents_find`. */
	names: string[];
}

/** A tool count that reveals the tools grouped by resource, one row each, so long tool lists stay out of the way. */
const ToolGroupsReveal: Component<ToolGroupsRevealProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const groups = createMemo(() => groupTools(props.names));

	// ----------------------------------------
	// Render
	return (
		<div>
			<button
				type="button"
				class="inline-flex items-center gap-1.5 rounded text-sm text-body hover:text-title"
				aria-expanded={open()}
				onClick={() => setOpen(!open())}
			>
				<TbOutlineTool class="size-3" />
				{T()(
					props.names.length === 1 ? "system.tool.count" : "system.tools.count",
					{
						count: props.names.length,
					},
				)}
				<TbOutlineChevronDown
					class="size-2.5 transition-transform"
					classList={{ "rotate-180": open() }}
				/>
			</button>
			<Show when={open()}>
				{/* joined rows, like the agent panel's suggested prompts. Rows share one label column as wide as the
				longest label, so tool names line up, and long tool lists wrap under themselves */}
				<ul class="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] divide-y divide-border overflow-hidden rounded-lg border border-border bg-input">
					<For each={groups()}>
						{(group) => (
							<li class="col-span-2 grid grid-cols-subgrid items-baseline gap-x-4 px-3.5 py-2.5 text-sm">
								<span class="font-medium text-title">{group.label}</span>
								<span class="text-muted">{group.actions.join(", ")}</span>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
};

export default ToolGroupsReveal;
