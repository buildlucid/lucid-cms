import { useLocation, useNavigate, useParams } from "@solidjs/router";
import type { AgentInput } from "@types";
import classnames from "classnames";
import { FaSolidArrowDown } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	on,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentCompactionDivider from "@/components/AgentCompactionDivider/AgentCompactionDivider";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import AgentComposerStack from "@/components/AgentComposerStack/AgentComposerStack";
import AgentContextRing from "@/components/AgentContextRing/AgentContextRing";
import AgentMessage from "@/components/AgentMessage/AgentMessage";
import AgentQuestionPanel from "@/components/AgentQuestionPanel/AgentQuestionPanel";
import AgentToolPanel from "@/components/AgentToolPanel/AgentToolPanel";
import Alert from "@/components/Alert/Alert";
import Button from "@/components/Button/Button";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoadingState from "@/components/LoadingState/LoadingState";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import Spinner from "@/components/Spinner/Spinner";
import useAgentChat from "@/hooks/useAgentChat/useAgentChat";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import api from "@/services/api";
import T from "@/translations";
import { isAgentDisconnected } from "@/utils/agent-access";
import { isCompactPart, isToolRow, placeCompactions } from "@/utils/agent-chat";
import AgentChatHeader from "./parts/AgentChatHeader";

/**
 * A single chat with the agent: a header, then messages that scroll on their
 * own with the chat box, or a question box while the agent waits on an answer,
 * fixed below them. A tool call opens in a floating panel beside the chat,
 * which closes with its close button, Escape, or by selecting the call again.
 */
const AgentConversationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ conversationId: string }>();
	//* a chat started from the agent home arrives unsaved, with the agent and first message
	const location = useLocation<{ message?: string; agentKey?: string }>();
	const navigate = useNavigate();
	const [creating, setCreating] = createSignal(
		location.state?.agentKey !== undefined,
	);
	const chat = useAgentChat(() =>
		creating() ? undefined : params.conversationId,
	);
	const createConversation = api.agent.useCreateConversation();
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	const [selectedToolId, setSelectedToolId] = createSignal<string>();
	let composer: AgentComposerHandle | undefined;

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.data());
	const latestRun = createMemo(() => conversation()?.latestRun);
	const compactions = createMemo(() =>
		placeCompactions(chat.messages, chat.compactions()),
	);
	const tools = createMemo(() =>
		chat.messages.flatMap((message) => message.parts.filter(isToolRow)),
	);
	const selectedTool = createMemo(() =>
		tools().find((tool) => tool.id === selectedToolId()),
	);
	const runError = createMemo(() => {
		const run = latestRun();
		return !chat.streaming() && run?.status === "failed"
			? run.errorMessage
			: undefined;
	});

	// ----------------------------------------
	// Functions
	const send = (text: string, mode: "send" | "steer") => {
		scroll.scrollToEnd("smooth");
		return chat.send(text, mode);
	};
	/** Picks an option, or approves or denies. */
	const answer = async (value: string) => {
		const question = chat.pendingQuestion();
		return question ? chat.respond(question, value) : false;
	};
	/** Typed text answers a question; for an approval it redirects the run instead. */
	const answerText = async (text: string) => {
		const question = chat.pendingQuestion();
		if (question?.kind === "question") return chat.respond(question, text);
		return chat.send(text, "steer");
	};
	/** Editing takes a queued message back into the chat box. */
	const edit = async (input: AgentInput) => {
		if (await chat.updateInput({ kind: "cancel", id: input.id })) {
			composer?.insert(input.text);
		}
	};
	const editLast = () => {
		const last = chat.inputs.findLast(
			(input) => input.status === "pending" && input.delivery.kind === "queue",
		);
		if (!last) return false;
		void edit(last);
		return true;
	};
	/** Opens a tool call in the panel, or closes it when it is already open. */
	const selectTool = (id: string) =>
		setSelectedToolId((current) => (current === id ? undefined : id));
	/**
	 * Whether a message starts with a compact row straight after one that ended
	 * with one. Rounds of tool calls arrive as separate messages, so this lets
	 * them read as one block.
	 */
	const continuesRows = (index: number) =>
		isCompactPart(chat.messages[index]?.parts[0]) &&
		isCompactPart(chat.messages[index - 1]?.parts.at(-1));
	//* a marker before the first loaded message may belong to an earlier page
	const compactedBefore = (id: string, index: number) =>
		compactions().before.has(id) && !(index === 0 && chat.history.hasNextPage);

	// ----------------------------------------
	// Effects
	/**
	 * A chat from the agent home opens before it is saved, so sending never waits
	 * there. It is saved here, then its first message is sent. If it
	 * cannot be saved, the message goes back to the agent home.
	 */
	onMount(async () => {
		const { message, agentKey } = location.state ?? {};
		if (!message) return;
		navigate(location.pathname, { replace: true, state: {} });
		if (agentKey) {
			try {
				await createConversation.action.mutateAsync({
					id: params.conversationId,
					agentKey,
				});
			} catch {
				navigate("/lucid/agent", { replace: true, state: { message } });
				return;
			}
			setCreating(false);
		}
		//* a message the agent did not accept goes into the chat box to try again
		if (!(await chat.send(message))) composer?.insert(message);
	});
	createEffect(() => {
		if (!selectedToolId()) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				setSelectedToolId(undefined);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});
	createEffect(
		on(
			() => params.conversationId,
			() => {
				setSelectedToolId(undefined);
				scroll.scrollToEnd();
			},
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		//* fills the viewport so only the chat scrolls; 4.25rem is the mobile navigation bar
		<div class="flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden rounded-t-xl border-x border-t border-border bg-background md:h-[calc(100dvh-1rem)]">
			<AgentChatHeader
				conversation={conversation()}
				actions={
					<ActionMenu
						size="md"
						variant="ghost"
						actions={[
							{
								label: T()("common.rename"),
								type: "button",
								icon: "pen",
								onClick: () => setRenameOpen(true),
							},
							{
								label: T()("common.delete"),
								type: "button",
								icon: "trash",
								variant: "danger",
								onClick: () => setDeleteOpen(true),
							},
						]}
					/>
				}
			/>
			<Show when={isAgentDisconnected()}>
				<Alert variant="warning" appearance="bar">
					{T()("agent.connection.required")}
				</Alert>
			</Show>
			<div class="relative flex min-h-0 grow">
				{/* makes room beside the tool panel on wide screens, so the chat and panel sit side by side */}
				<section
					class={classnames(
						"flex min-w-0 grow flex-col transition-[margin] duration-300 ease-out",
						{ "lg:mr-96": selectedTool() },
					)}
				>
					<Switch>
						<Match when={chat.conversation.isError}>
							<ErrorState
								title={T()("agent.chat.missing.title")}
								description={T()("agent.chat.missing.description")}
								actions={
									<Link variant="primary" size="sm" href="/lucid/agent">
										{T()("agent.chat.new")}
									</Link>
								}
							/>
						</Match>
						<Match when={chat.history.isLoading}>
							<LoadingState class="grow" />
						</Match>
						<Match when={true}>
							<div class="relative flex min-h-0 grow flex-col">
								<div
									ref={scroll.setViewport}
									class="min-h-0 grow overflow-y-auto scrollbar [overflow-anchor:none]"
								>
									<div ref={scroll.setSentinel} aria-hidden="true" />
									<div
										ref={scroll.setContent}
										class="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-10 md:px-6"
									>
										<For each={chat.messages}>
											{(message, index) => (
												<>
													<Show when={compactedBefore(message.id, index())}>
														<AgentCompactionDivider />
													</Show>
													<div
														data-chat-message
														class={classnames("flex flex-col", {
															"-mt-5": continuesRows(index()),
														})}
													>
														<AgentMessage
															message={message}
															pendingQuestionId={chat.pendingQuestion()?.id}
															selectedToolId={selectedToolId()}
															onSelectTool={selectTool}
														/>
													</div>
												</>
											)}
										</For>
										<Show when={compactions().trailing}>
											<AgentCompactionDivider />
										</Show>
										<Show when={chat.working() && !chat.pendingQuestion()}>
											<p
												role="status"
												class="flex items-center gap-2 text-sm text-muted"
											>
												<Spinner size="sm" />
												{latestRun()?.status === "interrupted" &&
												!chat.streaming()
													? T()("agent.chat.retrying")
													: chat.context()?.status === "compacting"
														? T()("agent.context.compacting")
														: T()("agent.chat.working")}
											</p>
										</Show>
										<Show
											when={
												!chat.streaming() && latestRun()?.status === "cancelled"
											}
										>
											<p class="text-sm text-muted">
												{T()("agent.chat.stopped")}
											</p>
										</Show>
										<Show when={chat.error() ?? runError()}>
											{(message) => <Alert variant="danger">{message()}</Alert>}
										</Show>
									</div>
								</div>
								{/* overlays, so they never shift the messages */}
								{/* messages fade out above the chat box rather than stopping at a hard edge */}
								<div
									aria-hidden="true"
									class="pointer-events-none absolute inset-x-0 -bottom-2.5 h-[2.625rem] bg-linear-to-t from-background to-transparent"
								/>
								<Show when={scroll.loadingEarlier()}>
									<div class="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
										<Spinner size="sm" />
									</div>
								</Show>
								<Show when={!scroll.following()}>
									<div class="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
										<Button
											variant="secondary"
											size="xs"
											shape="circle"
											class="pointer-events-auto shadow-md"
											aria-label={T()("agent.chat.latest")}
											title={T()("agent.chat.latest")}
											onClick={() => scroll.scrollToEnd("smooth")}
										>
											<FaSolidArrowDown size={11} />
										</Button>
									</div>
								</Show>
							</div>
						</Match>
					</Switch>
					{/* outside the loading state, so the chat box is ready while a chat loads */}
					<Show when={!chat.conversation.isError}>
						{/* above the fade, which tucks behind the top of the box */}
						<div class="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 md:px-6 md:pb-6">
							{/* a little wider than the messages, so the box frames them */}
							<div class="-mx-2.5">
								<AgentComposerStack
									inputs={chat.inputs}
									paused={chat.queuePaused()}
									canSteer={chat.activeRunId() !== undefined}
									onSteer={(input) => {
										const targetRunId = chat.activeRunId();
										if (targetRunId) {
											void chat.updateInput({
												kind: "steer",
												id: input.id,
												targetRunId,
											});
										}
									}}
									//* edits go back into the chat box, which a question replaces
									onEdit={
										chat.pendingQuestion()
											? undefined
											: (input) => void edit(input)
									}
									onCancel={(input) =>
										void chat.updateInput({ kind: "cancel", id: input.id })
									}
									onResume={() => void chat.updateInput({ kind: "resume" })}
									onClear={() => void chat.updateInput({ kind: "clear" })}
								/>
								<Show
									when={chat.pendingQuestion()}
									fallback={
										<AgentComposer
											ref={(handle) => {
												composer = handle;
											}}
											autofocus={true}
											draftKey={params.conversationId}
											placeholder={T()(
												chat.working()
													? "agent.composer.placeholder.busy"
													: "agent.composer.placeholder",
											)}
											queueable={true}
											busy={chat.working()}
											onStop={
												chat.working() ? () => void chat.stop() : undefined
											}
											onSubmit={send}
											onEditLast={editLast}
											end={
												<Show when={chat.context()}>
													{(context) => (
														<AgentContextRing
															context={context()}
															busy={chat.working()}
															onCompact={() => void chat.compact()}
														/>
													)}
												</Show>
											}
										/>
									}
								>
									{(question) => (
										<AgentQuestionPanel
											question={question()}
											onAnswer={answer}
											onSubmit={answerText}
											onStop={() => void chat.stop()}
										/>
									)}
								</Show>
							</div>
						</div>
					</Show>
				</section>
				<Show when={selectedTool()}>
					{(tool) => (
						<AgentToolPanel
							part={tool()}
							onClose={() => setSelectedToolId(undefined)}
							class="absolute top-4 right-4 z-20 hidden max-h-[calc(100%-2rem)] w-88 lg:flex"
						/>
					)}
				</Show>
			</div>
			<RenameAgentConversationModal
				conversation={conversation}
				state={{ open: renameOpen(), setOpen: setRenameOpen }}
			/>
			<DeleteAgentConversationModal
				id={() => params.conversationId}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
				onDeleted={() => navigate("/lucid/agent")}
			/>
		</div>
	);
};

export default AgentConversationPage;
