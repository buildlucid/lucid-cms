import type { AgentRoutine } from "@types";
import classnames from "classnames";
import { TbOutlineArrowDown } from "solid-icons/tb";
import {
	type Component,
	createSignal,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import AgentChatComposer from "@/components/AgentChatComposer/AgentChatComposer";
import AgentChatTranscript from "@/components/AgentChatTranscript/AgentChatTranscript";
import Button from "@/components/Button/Button";
import ErrorState from "@/components/ErrorState/ErrorState";
import LoadingState from "@/components/LoadingState/LoadingState";
import Spinner from "@/components/Spinner/Spinner";
import type { AgentChat } from "@/hooks/useAgentChat/useAgentChat";
import type { AgentChatView } from "@/hooks/useAgentChatView/useAgentChatView";
import type { useChatScroll } from "@/hooks/useChatScroll/useChatScroll";
import T from "@/translations";
import AgentChatTimeline from "./parts/AgentChatTimeline";

/**
 * A chat's messages, scrolling on their own above its chat box. Shared by the
 * chat page, which centres it in a wide column, and the agent panel.
 */
const AgentChatThread: Component<{
	chat: AgentChat;
	view: AgentChatView;
	scroll: ReturnType<typeof useChatScroll>;
	conversationId: string;
	variant: "page" | "panel";
	routine?: AgentRoutine;
	/** Offered when the chat can't be loaded, eg. a link to a new chat. */
	missingAction: JSXElement;
	onEditRoutineConfirmations?: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [attached, setAttached] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<>
			<Switch>
				<Match when={props.chat.conversation.isError}>
					<ErrorState
						title={T()("agent.chat.missing.title")}
						description={T()("agent.chat.missing.description")}
						actions={props.missingAction}
					/>
				</Match>
				<Match when={props.chat.history.isLoading}>
					<LoadingState class="grow" />
				</Match>
				<Match when={true}>
					<div class="@container relative flex min-h-0 grow flex-col">
						<div
							ref={props.scroll.setViewport}
							class="min-h-0 grow overflow-y-auto scrollbar [overflow-anchor:none]"
						>
							<div ref={props.scroll.setSentinel} aria-hidden="true" />
							<div
								ref={props.scroll.setContent}
								class={classnames(
									"flex w-full flex-col gap-6 px-4",
									props.variant === "page"
										? "mx-auto max-w-3xl pt-8 md:px-6"
										: "pt-6",
									attached() ? "pb-32" : "pb-10",
								)}
							>
								<AgentChatTranscript
									chat={props.chat}
									referenceDetails={props.view.referenceDetails()}
									selectedToolId={props.view.selectedId()}
									retriedToolIds={props.view.retriedTools()}
									onSelectTool={props.view.selectTool}
									onRespond={props.view.respond}
									canRetry={!props.view.unavailable()}
								/>
							</div>
						</div>
						<div
							aria-hidden="true"
							class={classnames(
								"pointer-events-none absolute inset-x-0 -bottom-2.5 bg-linear-to-t from-background to-transparent",
								attached() ? "h-18" : "h-10.5",
							)}
						/>
						<div
							aria-hidden="true"
							class="pointer-events-none absolute inset-x-0 top-0 h-8 bg-linear-to-b from-background to-transparent"
						/>
						<AgentChatTimeline
							messages={props.chat.messages}
							viewport={props.scroll.viewport()}
							onSelect={props.scroll.scrollToMessage}
						/>
						<Show when={props.scroll.loadingEarlier()}>
							<div class="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
								<Spinner size="sm" variant="subtle" />
							</div>
						</Show>
						<Show when={!props.scroll.following()}>
							<div
								class={classnames(
									"pointer-events-none absolute inset-x-0 flex justify-center",
									attached() ? "bottom-32" : "bottom-3",
								)}
							>
								<Button
									variant="secondary"
									size="xs"
									shape="circle"
									class="group pointer-events-auto shadow-md"
									aria-label={T()("agent.chat.latest")}
									title={T()("agent.chat.latest")}
									onClick={() => props.scroll.scrollToEnd("smooth")}
								>
									<Show
										when={
											props.chat.working() && !props.chat.pendingInteraction()
										}
										fallback={<TbOutlineArrowDown size={11} />}
									>
										<Spinner
											size="sm"
											variant="secondary"
											class="group-hover:hidden group-focus-visible:hidden"
										/>
										<TbOutlineArrowDown
											size={11}
											class="hidden group-hover:block group-focus-visible:block"
										/>
									</Show>
								</Button>
							</div>
						</Show>
					</div>
				</Match>
			</Switch>
			<Show when={!props.chat.conversation.isError}>
				<div
					class={classnames(
						"relative w-full shrink-0",
						props.variant === "page"
							? "mx-auto max-w-3xl px-4 pb-4 md:px-6 md:pb-6"
							: "px-3 pb-3",
					)}
				>
					<div class={classnames({ "-mx-2.5": props.variant === "page" })}>
						<AgentChatComposer
							chat={props.chat}
							conversationId={props.conversationId}
							agent={props.view.agent()}
							routine={props.routine}
							referenceDetails={props.view.referenceDetails()}
							ref={props.view.setComposer}
							onAttachedChange={setAttached}
							onReferencesChange={props.view.onReferencesChange}
							onRespond={props.view.respond}
							onSend={() => props.scroll.scrollToEnd("smooth")}
							onEditRoutineConfirmations={props.onEditRoutineConfirmations}
							//* the panel is narrow, so its toolbar keeps to the controls
							capabilityHints={props.variant === "page"}
						/>
					</div>
				</div>
			</Show>
		</>
	);
};

export default AgentChatThread;
