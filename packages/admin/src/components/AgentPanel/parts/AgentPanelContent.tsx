import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import AgentChatHeader from "@/components/AgentChatHeader/AgentChatHeader";
import AgentChatThread from "@/components/AgentChatThread/AgentChatThread";
import AgentDetailsDialog from "@/components/AgentDetailsDialog/AgentDetailsDialog";
import AgentHome from "@/components/AgentHome/AgentHome";
import { AgentTranscriptContext } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import Button from "@/components/Button/Button";
import useAgentChatView from "@/hooks/useAgentChatView/useAgentChatView";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import type { useHoverReveal } from "@/hooks/useHoverReveal/useHoverReveal";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import AgentPanelActions from "./AgentPanelActions";

//* above the page's fixed bars (36), below drawers (40) and modals (50) opened from the page
const panelLayer = 39;

/** How the panel peeks in from the right edge while closed. */
type AgentPanelPeek = {
	revealed: boolean;
	ref: (element: HTMLElement) => void;
	handlers: ReturnType<typeof useHoverReveal>["handlers"];
	onConceal: () => void;
	/** Keeps it open beside the content, as toggling it does. */
	onPin: () => void;
};

/** The panel's chat, or the new chat box when none is open. A tool call's details open in a dialog over it. */
const AgentPanelContent: Component<{
	/** Peeking in from the right edge, floating over the content, rather than open. */
	peek?: AgentPanelPeek;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	const chat = session.chat;
	//* a chat with an agent kept out of the sidebar, eg. one opened on its page, stays there
	const conversationId = createMemo(() => {
		const agentKey = chat.data()?.agentKey;
		return agentKey === undefined ||
			getAgentAccess().sidebar.some((agent) => agent.key === agentKey)
			? session.conversationId()
			: undefined;
	});
	const view = useAgentChatView({ chat, conversationId });
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [details, setDetails] = createSignal<HTMLElement>();
	//* opening slides it in, unless it was already showing as a peek, as when it's pinned
	const opening = createMemo(
		(previous: { revealed: boolean; slides: boolean }) =>
			props.peek
				? { revealed: props.peek.revealed, slides: false }
				: { revealed: false, slides: !previous.revealed },
		{ revealed: false, slides: false },
	);

	// ----------------------------------------
	// Effects
	createEffect(on(conversationId, () => scroll.scrollToEnd(), { defer: true }));

	// ----------------------------------------
	// Render
	return (
		//* drawers, dialogs and menus opened from the panel stack above it while it floats
		<LayerContext.Provider value={() => panelLayer}>
			<AgentTranscriptContext.Provider
				value={{
					selected: view.selectedId,
					select: view.setSelectedId,
					sidebar: details,
					mediaAttachments: view.mediaAttachments,
				}}
			>
				{/* full height and flush with the right edge, with only a start border, mirroring the navigation on the left */}
				<aside
					ref={(element) => props.peek?.ref(element)}
					aria-label={T()("agent.panel.label")}
					style={{ "z-index": panelLayer }}
					//* hidden off the edge while peeking, so it can't be tabbed into
					inert={props.peek !== undefined && !props.peek.revealed}
					class={classNames(
						"fixed flex",
						props.peek
							? classNames(
									"inset-y-0 end-0 w-96 transition-[translate] duration-300 ease-emphasized motion-reduce:transition-none",
									props.peek.revealed
										? "translate-x-0"
										: "translate-x-full rtl:-translate-x-full",
								)
							: //* floats over the content until xl, where it docks beside it
								"inset-0 md:start-auto md:w-96 xl:sticky xl:h-dvh xl:w-agent-panel",
					)}
					onPointerEnter={() => props.peek?.handlers.onPointerEnter()}
					onPointerLeave={(event) => props.peek?.handlers.onPointerLeave(event)}
					onFocusIn={() => props.peek?.handlers.onFocusIn()}
					onFocusOut={(event) => props.peek?.handlers.onFocusOut(event)}
				>
					<div
						class={classNames(
							"relative flex min-w-0 grow flex-col overflow-hidden bg-background bg-clip-padding md:border-s md:border-border",
							props.peek
								? classNames(
										"transition-shadow duration-300 motion-reduce:transition-none",
										{
											"shadow-[0_20px_70px_rgba(0,0,0,0.45)]":
												props.peek.revealed,
										},
									)
								: classNames("md:shadow-lg xl:shadow-none", {
										"motion-safe:animate-from-right": opening().slides,
									}),
						)}
					>
						<AgentChatHeader
							variant="panel"
							conversation={conversationId() ? chat.data() : undefined}
							emptyTitle={conversationId() ? undefined : T()("agent.chat.new")}
							actions={
								<AgentPanelActions
									conversationId={conversationId()}
									onOpen={session.open}
									onPin={props.peek?.onPin}
									onClose={() =>
										props.peek
											? props.peek.onConceal()
											: session.panel.setOpen(false)
									}
								/>
							}
						/>
						{/* keyed, as the chat box saves its draft under the chat's ID while it unmounts */}
						<Show
							when={conversationId()}
							keyed
							fallback={
								<div class="flex min-h-0 grow flex-col">
									<AgentHome variant="panel" />
								</div>
							}
						>
							{(id) => (
								<AgentChatThread
									chat={chat}
									view={view}
									scroll={scroll}
									conversationId={id}
									variant="panel"
									onBranched={session.open}
									missingAction={
										<Button
											variant="primary"
											size="sm"
											onClick={() => session.open(undefined)}
										>
											{T()("agent.chat.new")}
										</Button>
									}
								/>
							)}
						</Show>
					</div>
				</aside>
				<AgentDetailsDialog
					view={view}
					conversationId={conversationId()}
					ref={setDetails}
				/>
			</AgentTranscriptContext.Provider>
		</LayerContext.Provider>
	);
};

export default AgentPanelContent;
