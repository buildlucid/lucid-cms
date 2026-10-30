import { createHotkey } from "@tanstack/solid-hotkeys";
import { type Component, createEffect, onCleanup, Show } from "solid-js";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { shortcuts } from "@/utils/shortcuts";
import AgentPanelContent from "./parts/AgentPanelContent";

/**
 * The open agent chat beside any admin page, so following what the agent
 * links to never leaves the chat. From xl it docks beside the content, which
 * narrows to make room; on smaller screens it floats over it. Toggled from the
 * navigation or the keyboard and remembered between visits.
 */
const AgentPanel: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();

	// ----------------------------------------
	// Effects
	createHotkey(
		shortcuts.toggleAgentPanel.hotkey,
		() => session.panel.setOpen(!session.panel.open()),
		() => ({
			enabled: session.panel.available(),
		}),
	);
	//* the content-* variants and the panel's spacing token read this
	createEffect(() =>
		document.documentElement.toggleAttribute(
			"data-agent-panel",
			session.panel.visible(),
		),
	);
	onCleanup(() => document.documentElement.removeAttribute("data-agent-panel"));

	// ----------------------------------------
	// Render
	return (
		<Show when={session.panel.visible()}>
			<AgentPanelContent />
		</Show>
	);
};

export default AgentPanel;
