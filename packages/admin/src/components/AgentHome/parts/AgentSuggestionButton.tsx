import type { Agent } from "@types";
import classnames from "classnames";
import { TbOutlineArrowRight, TbOutlineSparkles } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import { translateAdminCopy } from "@/translations";

const AgentSuggestionButton: Component<{
	suggestion: Agent["suggestions"][number];
	disabled: boolean;
	/** A one-line row with the title alone rather than a card, for a list that draws its own box, eg. in the narrow agent panel. */
	compact?: boolean;
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
				class={classnames(
					"group flex w-full gap-2.5 text-start transition-colors duration-200 hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
					props.compact
						? "items-center px-3.5 py-2.5 focus-visible:ring-inset disabled:hover:bg-transparent"
						: "h-full items-start rounded-xl border border-border bg-card/50 px-3.5 py-3 hover:border-body/25 disabled:hover:border-border disabled:hover:bg-card/50",
				)}
			>
				<TbOutlineSparkles
					size={12}
					class={classnames("shrink-0 text-icon", { "mt-1": !props.compact })}
				/>
				<span class="flex min-w-0 flex-1 flex-col gap-0.5">
					<span
						class={classnames(
							"text-sm text-title",
							props.compact
								? "truncate"
								: "line-clamp-2 wrap-break-word font-medium",
						)}
					>
						{translateAdminCopy(props.suggestion.title)}
					</span>
					<Show when={!props.compact}>
						<span class="line-clamp-2 wrap-break-word text-xs leading-5 text-body">
							{translateAdminCopy(props.suggestion.description)}
						</span>
					</Show>
				</span>
				<TbOutlineArrowRight
					size={11}
					class={classnames(
						"shrink-0 text-icon opacity-0 transition-opacity duration-200 group-enabled:group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180",
						{ "mt-1": !props.compact },
					)}
				/>
			</button>
		</li>
	);
};

export default AgentSuggestionButton;
