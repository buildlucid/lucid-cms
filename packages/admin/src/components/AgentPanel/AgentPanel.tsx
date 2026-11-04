import { createHotkey } from "@tanstack/solid-hotkeys";
import {
	type Component,
	createEffect,
	createMemo,
	onCleanup,
	Show,
} from "solid-js";
import HoverRevealBar from "@/components/HoverRevealBar/HoverRevealBar";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import { useHoverReveal } from "@/hooks/useHoverReveal/useHoverReveal";
import { useMediaQuery } from "@/hooks/useMediaQuery/useMediaQuery";
import { usePointerNear } from "@/hooks/usePointerNear/usePointerNear";
import { shortcuts } from "@/utils/shortcuts";
import AgentPanelContent from "./parts/AgentPanelContent";

//* what the chat opens outside itself, such as its menus, model picker and dialogs, which pressing doesn't count as leaving it
const FLOATING_SELECTOR =
	"[data-popper-positioner], [data-kb-top-layer], [role='menu'], [role='listbox'], [role='dialog']";

/**
 * Persistent agent chat beside admin pages. Docks from xl and overlays smaller screens. Remembers
 * its open state; when closed, edge hover reveals it with an option to pin it open.
 */
const AgentPanel: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	const desktop = useMediaQuery("(width >= 48rem)");
	let peekRef: HTMLElement | undefined;
	let edgeRef: HTMLDivElement | undefined;
	const canPeek = createMemo(
		() => desktop() && session.panel.available() && !session.panel.open(),
	);
	const peek = useHoverReveal({ element: () => peekRef, enabled: canPeek });
	//* its edge marker shows once the pointer heads for it
	const nearEdge = usePointerNear({
		element: () => edgeRef,
		enabled: canPeek,
	});
	//* mounted once first revealed, so it slides out as well as in without loading the chat on every page
	const peeked = createMemo((was: boolean) => was || peek.revealed(), false);

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
	createEffect(() => {
		if (!peek.revealed()) return;
		//* pressing anywhere else hides it, without a backdrop that clicks could land on as menus close
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (
				!(target instanceof Element) ||
				peekRef?.contains(target) ||
				edgeRef?.contains(target) ||
				target.closest(FLOATING_SELECTOR)
			) {
				return;
			}
			peek.conceal();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			//* a menu, list or dialog opened from the chat closes on Escape first
			if (
				event.key !== "Escape" ||
				event.defaultPrevented ||
				(event.target instanceof Element &&
					event.target.closest(FLOATING_SELECTOR))
			) {
				return;
			}
			peek.conceal();
		};
		document.addEventListener("pointerdown", onPointerDown, true);
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			window.removeEventListener("keydown", onKeyDown);
		});
	});
	onCleanup(() => document.documentElement.removeAttribute("data-agent-panel"));

	// ----------------------------------------
	// Render
	return (
		<>
			{/* one panel for both, so keeping a peeking chat open doesn't load it again */}
			<Show when={session.panel.visible() || (canPeek() && peeked())}>
				<AgentPanelContent
					peek={
						canPeek()
							? {
									revealed: peek.revealed(),
									ref: (element) => {
										peekRef = element;
									},
									handlers: peek.handlers,
									onConceal: peek.conceal,
									onPin: () => session.panel.setOpen(true),
								}
							: undefined
					}
				/>
			</Show>
			<Show when={canPeek()}>
				<div
					ref={edgeRef}
					aria-hidden="true"
					class="group fixed inset-y-0 inset-e-0 z-38 w-4"
					onPointerEnter={peek.handlers.onPointerEnter}
					onPointerLeave={peek.handlers.onPointerLeave}
				>
					<HoverRevealBar
						orientation="vertical"
						hidden={peek.revealed() || !nearEdge()}
						class="top-1/2 inset-e-1 -translate-y-1/2"
					/>
				</div>
			</Show>
		</>
	);
};

export default AgentPanel;
