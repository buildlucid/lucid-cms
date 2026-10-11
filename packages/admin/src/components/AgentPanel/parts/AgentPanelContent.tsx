import { type Component, createEffect, createSignal, on, Show } from "solid-js";
import AgentChatHeader from "@/components/AgentChatHeader/AgentChatHeader";
import AgentChatThread from "@/components/AgentChatThread/AgentChatThread";
import AgentDetailsDialog from "@/components/AgentDetailsDialog/AgentDetailsDialog";
import AgentHome from "@/components/AgentHome/AgentHome";
import { AgentTranscriptContext } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import Button from "@/components/Button/Button";
import useAgentChatView from "@/hooks/useAgentChatView/useAgentChatView";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import T from "@/translations";
import AgentPanelActions from "./AgentPanelActions";

//* above the page's fixed bars (36), below drawers (40) and modals (50) opened from the page
const panelLayer = 39;

/** The panel's chat, or the new chat box when none is open. A tool call's details open in a dialog over it. */
const AgentPanelContent: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const session = useAgentSession();
	const chat = session.chat;
	const view = useAgentChatView({
		chat,
		conversationId: session.conversationId,
	});
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [details, setDetails] = createSignal<HTMLElement>();

	// ----------------------------------------
	// Effects
	createEffect(
		on(session.conversationId, () => scroll.scrollToEnd(), { defer: true }),
	);

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
				<aside
					aria-label={T()("agent.panel.label")}
					style={{ "z-index": panelLayer }}
					class="fixed inset-0 flex md:inset-y-2 md:start-auto md:end-2 md:w-96 xl:sticky xl:top-0 xl:h-dvh xl:w-agent-panel xl:pt-4 xl:pe-2"
				>
					<div class="relative flex min-w-0 grow flex-col overflow-hidden bg-background bg-clip-padding motion-safe:animate-from-right md:rounded-xl md:border md:border-border md:shadow-lg xl:rounded-b-none xl:border-b-0 xl:shadow-none">
						<AgentChatHeader
							variant="panel"
							conversation={chat.data()}
							emptyTitle={
								session.conversationId() ? undefined : T()("agent.chat.new")
							}
							actions={
								<AgentPanelActions
									conversationId={session.conversationId()}
									onOpen={session.open}
									onClose={() => session.panel.setOpen(false)}
								/>
							}
						/>
						{/* keyed, as the chat box saves its draft under the chat's ID while it unmounts */}
						<Show
							when={session.conversationId()}
							keyed
							fallback={
								<div class="flex min-h-0 grow flex-col overflow-y-auto scrollbar">
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
					conversationId={session.conversationId()}
					ref={setDetails}
				/>
			</AgentTranscriptContext.Provider>
		</LayerContext.Provider>
	);
};

export default AgentPanelContent;
