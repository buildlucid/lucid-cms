import type { Agent } from "@types";
import { TbOutlineArrowRight } from "solid-icons/tb";
import type { Component } from "solid-js";
import { translateAdminCopy } from "@/translations";

const AgentSuggestionButton: Component<{
	suggestion: Agent["suggestions"][number];
	disabled: boolean;
	onSelect: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li>
			<button
				type="button"
				disabled={props.disabled}
				onClick={props.onSelect}
				class="group flex h-full w-full items-start gap-3 rounded-xl border border-border bg-card/50 px-3.5 py-3 text-start transition-colors duration-200 hover:border-body/25 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-card/50"
			>
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span class="line-clamp-2 wrap-break-word text-sm font-medium text-title">
						{translateAdminCopy(props.suggestion.title)}
					</span>
					<span class="line-clamp-2 wrap-break-word text-xs leading-5 text-body">
						{translateAdminCopy(props.suggestion.description)}
					</span>
				</span>
				<TbOutlineArrowRight
					size={11}
					class="mt-1 shrink-0 text-icon opacity-0 transition-opacity duration-200 group-enabled:group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180"
				/>
			</button>
		</li>
	);
};

export default AgentSuggestionButton;
