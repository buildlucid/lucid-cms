import { formatForDisplay } from "@tanstack/solid-hotkeys";
import classnames from "classnames";
import { TbOutlineRobot } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import T from "@/translations";
import {
	getNavigationActionClasses,
	type NavigationActionVariant,
} from "@/utils/navigation";
import { shortcuts } from "@/utils/shortcuts";

/** Toggles the agent panel, shows busy or waiting status when closed, and stays disabled on pages already showing an agent chat. */
export const AgentPanelToggle: Component<{
	size?: "sm" | "md";
	variant?: NavigationActionVariant;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();

	// ----------------------------------------
	// Memos
	const open = createMemo(
		() => session.panel.available() && session.panel.open(),
	);
	const label = createMemo(() => {
		if (!session.panel.available()) return T()("agent.panel.here");
		return T()(open() ? "agent.panel.close" : "agent.panel.open");
	});
	const status = createMemo(() => {
		if (open() || !session.panel.available()) return undefined;
		if (session.chat.waiting()) return "waiting";
		return session.chat.working() ? "working" : undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={session.panel.allowed()}>
			<button
				type="button"
				class={getNavigationActionClasses(props)}
				disabled={!session.panel.available()}
				aria-pressed={open()}
				aria-label={label()}
				title={
					session.panel.available()
						? `${label()} (${formatForDisplay(shortcuts.toggleAgentPanel.hotkey)})`
						: label()
				}
				onClick={() => session.panel.setOpen(!open())}
			>
				<TbOutlineRobot class="size-3.5" />
				<Show when={status()}>
					{(current) => (
						<span
							class={classnames(
								"absolute top-1 inset-e-1 size-1.5 rounded-full ring-2 ring-sidebar",
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
