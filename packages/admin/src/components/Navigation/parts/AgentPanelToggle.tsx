import classnames from "classnames";
import { TbOutlineRobot } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { shortcutText } from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import T from "@/translations";

/** Opens and closes the agent panel, marking a busy or waiting chat while it is closed. Hidden where the panel can't show. */
export const AgentPanelToggle: Component<{
	size?: "sm" | "md";
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();

	// ----------------------------------------
	// Memos
	const open = createMemo(() => session.panel.open());
	const label = createMemo(() =>
		T()(open() ? "agent.panel.close" : "agent.panel.open"),
	);
	const status = createMemo(() => {
		if (open()) return undefined;
		if (session.chat.waiting()) return "waiting";
		return session.chat.working() ? "working" : undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={session.panel.available()}>
			<button
				type="button"
				class={classnames(
					"relative flex shrink-0 items-center justify-center rounded-md transition-colors hover:bg-background-hover hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
					props.size === "md" ? "size-9" : "size-8",
					open() ? "bg-background-hover text-icon-hover" : "text-icon",
				)}
				aria-pressed={open()}
				aria-label={label()}
				title={`${label()} (${shortcutText.toggleAgentPanel})`}
				onClick={() => session.panel.setOpen(!open())}
			>
				<TbOutlineRobot class="size-3.5" />
				<Show when={status()}>
					{(current) => (
						<span
							class={classnames(
								"absolute top-1 end-1 size-1.5 rounded-full ring-2 ring-sidebar",
								current() === "waiting"
									? "bg-warning"
									: "bg-primary motion-safe:animate-pulse",
							)}
							aria-hidden="true"
						/>
					)}
				</Show>
			</button>
		</Show>
	);
};
