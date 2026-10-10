import { Tooltip } from "@kobalte/core";
import type { AgentScreen } from "@types";
import classnames from "classnames";
import { TbOutlineFileText, TbOutlineGitPullRequest } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";

/** Shows a message's admin screen as a composer pill or sent-message icon, with a tooltip explaining the agent's access. */
const AgentScreenBadge: Component<{
	screen: AgentScreen;
	variant: "pill" | "icon";
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const label = createMemo(() =>
		T()(
			props.variant === "pill"
				? "agent.screen.label"
				: "agent.screen.sent.from",
			{ name: props.screen.label },
		),
	);
	const hint = createMemo(() => {
		const isDocument = props.screen.type === "document";
		if (props.variant === "pill") {
			return T()(
				isDocument ? "agent.screen.hint.document" : "agent.screen.hint",
			);
		}
		return T()(
			isDocument ? "agent.screen.sent.hint.document" : "agent.screen.sent.hint",
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Tooltip.Root openDelay={300} placement="top">
			<Tooltip.Trigger
				as="span"
				tabIndex={0}
				aria-label={label()}
				class={classnames(
					"focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
					props.variant === "pill"
						? "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs text-subtitle"
						: "flex size-6 items-center justify-center rounded-md transition-colors hover:bg-card hover:text-body",
					props.class,
				)}
			>
				<Show
					when={props.screen.type === "request"}
					fallback={
						<TbOutlineFileText
							size={props.variant === "pill" ? 12 : 11}
							class="shrink-0"
							aria-hidden="true"
						/>
					}
				>
					<TbOutlineGitPullRequest
						size={props.variant === "pill" ? 12 : 11}
						class="shrink-0"
						aria-hidden="true"
					/>
				</Show>
				<Show when={props.variant === "pill"}>
					<span class="truncate">{label()}</span>
				</Show>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="z-60 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-popover p-3 shadow-md animate-dropdown">
					<p class="text-pretty text-xs font-medium text-title">{label()}</p>
					<p class="mt-0.5 text-pretty text-xs text-body">{hint()}</p>
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};

export default AgentScreenBadge;
