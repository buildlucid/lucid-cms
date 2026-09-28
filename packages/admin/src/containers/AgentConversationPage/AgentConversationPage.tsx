import { useLocation, useNavigate, useParams } from "@solidjs/router";
import type {
	AgentApprovalMode,
	AgentInput,
	AgentInteractionAction,
	AiModelSelection,
} from "@types";
import classnames from "classnames";
import { FaSolidArrowDown, FaSolidEllipsis } from "solid-icons/fa";
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
import AgentApprovalPicker from "@/components/AgentApprovalPicker/AgentApprovalPicker";
import AgentCompactionDivider from "@/components/AgentCompactionDivider/AgentCompactionDivider";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import AgentComposerStack from "@/components/AgentComposerStack/AgentComposerStack";
import AgentContextRing from "@/components/AgentContextRing/AgentContextRing";
import AgentErrorNotice from "@/components/AgentErrorNotice/AgentErrorNotice";
import AgentInteractionBar from "@/components/AgentInteractionBar/AgentInteractionBar";
import AgentMessage from "@/components/AgentMessage/AgentMessage";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import { AgentTranscriptContext } from "@/components/AgentTranscriptRow/AgentTranscriptContext";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import AgentWidget from "@/components/AgentWidget/AgentWidget";
import { layoutOf } from "@/components/AgentWidget/slots";
import Button from "@/components/Button/Button";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoadingState from "@/components/LoadingState/LoadingState";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import Spinner from "@/components/Spinner/Spinner";
import UpsertAgentRoutineDrawer from "@/components/UpsertAgentRoutineDrawer/UpsertAgentRoutineDrawer";
import ViewAgentRoutineRunsDrawer from "@/components/ViewAgentRoutineRunsDrawer/ViewAgentRoutineRunsDrawer";
import useAgentChat from "@/hooks/useAgentChat/useAgentChat";
import useChatScroll from "@/hooks/useChatScroll/useChatScroll";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import { getAgentUnavailableReason } from "@/utils/agent-access";
import { isToolRow, placeCompactions } from "@/utils/agent-chat";
import AgentChatActions from "./parts/AgentChatActions";
import AgentChatHeader from "./parts/AgentChatHeader";
import AgentChatSidebar from "./parts/AgentChatSidebar";
import AgentChatTimeline from "./parts/AgentChatTimeline";

/**
 * A single chat with the agent: a header, then messages that scroll on their
 * own with the chat box, or a question box while the agent waits on an answer,
 * fixed below them. A tool call opens in a floating panel beside the chat,
 * which closes with its close button, Escape, or by selecting the call again.
 * The chat's details card sits above it, toggled from the header and
 * remembered between chats.
 */
const AgentConversationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ conversationId: string }>();
	//* a chat started from the agent home arrives unsaved, with the agent and first message
	const location = useLocation<{
		message?: string;
		agentKey?: string;
		approvalMode?: AgentApprovalMode;
		modelSelection?: AiModelSelection;
	}>();
	const navigate = useNavigate();
	const [creating, setCreating] = createSignal(
		location.state?.agentKey !== undefined,
	);
	const chat = useAgentChat(() =>
		creating() ? undefined : params.conversationId,
	);
	const createConversation = api.agent.useCreateConversation();
	const updateConversation = api.agent.useUpdateConversation();
	const scroll = useChatScroll({
		hasEarlier: () => chat.history.hasNextPage,
		loadEarlier: () => chat.history.fetchNextPage(),
	});
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	//* one item is open in the sidebar at a time: a tool call or a transcript row's panel
	const [selectedId, setSelectedId] = createSignal<string>();
	const [sidebar, setSidebar] = createSignal<HTMLElement>();
	//* the composer interaction set aside to send instructions instead
	const [redirecting, setRedirecting] = createSignal<string>();
	const [routineOpen, setRoutineOpen] = createSignal(false);
	const [focusApprovals, setFocusApprovals] = createSignal(false);
	const [routineCardOpen, setRoutineCardOpen] = createSignal(true);
	const [runsOpen, setRunsOpen] = createSignal(false);
	let composer: AgentComposerHandle | undefined;

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.data());
	const unavailable = createMemo(() => getAgentUnavailableReason());
	const latestRun = createMemo(() => conversation()?.latestRun);
	//* shares the model picker's query; chat waits for it as it needs the same Lucid connection
	const models = api.agent.useGetModels({
		agentKey: () => conversation()?.agentKey,
		routineId: () => conversation()?.routineId ?? undefined,
	});
	const routineQuery = api.agent.useGetRoutine({
		id: () => conversation()?.routineId ?? undefined,
	});
	const routine = createMemo(() =>
		routineQuery.isSuccess ? routineQuery.data.data : undefined,
	);
	const routineCard = createMemo(() =>
		routineCardOpen() ? routine() : undefined,
	);
	const detailsOpen = createMemo(
		() => userPreferencesStore.getSectionOpen("agent.chat.details") ?? false,
	);
	const sidebarOpen = createMemo(
		() => routineCard() !== undefined || detailsOpen() || !!selectedId(),
	);
	const compactions = createMemo(() =>
		placeCompactions(chat.messages, chat.compactions()),
	);
	const tools = createMemo(() =>
		chat.messages.flatMap((message) => message.parts.filter(isToolRow)),
	);
	const selectedTool = createMemo(() =>
		tools().find((tool) => tool.id === selectedId()),
	);
	const composerWidget = createMemo(() => {
		const pending = chat.pendingInteraction();
		return pending?.widget.interaction?.placement === "composer"
			? pending
			: undefined;
	});
	const activeWidget = createMemo(() => {
		const pending = composerWidget();
		return pending?.id !== redirecting() ? pending : undefined;
	});
	/**
	 * What the end of the transcript shows while the agent works without waiting
	 * on the reader. Its last row shimmers, streaming text needs nothing, and
	 * otherwise a status line holds the place of the reply to come.
	 */
	const activity = createMemo(() => {
		if (!chat.working() || chat.pendingInteraction()) return undefined;
		if (latestRun()?.status === "interrupted" && !chat.streaming()) {
			return "retrying";
		}
		if (chat.context()?.status === "compacting") return "compacting";
		const last = chat.messages.at(-1);
		const part = last?.parts.findLast((item) => layoutOf(item) !== "hidden");
		if (last?.role === "user" || !part) return "thinking";
		if (layoutOf(part) === "row") return "row";
		return part.type === "text" ? undefined : "thinking";
	});
	const runError = createMemo(() => {
		const run = latestRun();
		return !chat.streaming() && run?.status === "failed"
			? run.errorMessage
			: undefined;
	});

	// ----------------------------------------
	// Functions
	const send = (text: string, mode: "send" | "steer") => {
		//* a run reads the chat's settings when it starts, so wait for a change to save
		if (
			unavailable() ||
			!models.isSuccess ||
			updateConversation.action.isPending
		) {
			return false;
		}
		scroll.scrollToEnd("smooth");
		return chat.send(text, chat.waiting() ? "steer" : mode);
	};
	const respond = async (
		interactionId: string,
		response: Record<string, unknown>,
		action: AgentInteractionAction = "submit",
	) => {
		const reason = unavailable();
		if (reason) return { error: T()(`agent.unavailable.${reason}.title`) };
		const pending = chat.pendingInteraction();
		if (!pending || pending.id !== interactionId) {
			return { error: T()("agent.interaction.unavailable") };
		}

		const result = await chat.respond(pending, response, action);
		if (
			result.error === undefined &&
			pending.widget.interaction?.placement === "inline"
		) {
			composer?.focus();
		}

		return result;
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
	const setDetailsOpen = (open: boolean) =>
		userPreferencesStore.setSectionOpen("agent.chat.details", open);
	/** Opens a tool call in the panel, or closes it when it is already open. */
	const selectTool = (id: string) =>
		setSelectedId((current) => (current === id ? undefined : id));

	const shownLayouts = (index: number) =>
		(chat.messages[index]?.parts ?? [])
			.map(layoutOf)
			.filter((layout) => layout !== "hidden");
	const endsInRow = (index: number) => shownLayouts(index).at(-1) === "row";
	/**
	 * Whether a message starts with a row straight after one that ended with
	 * one. Each model turn is its own message, so this lets rows read as one
	 * block.
	 */
	const continuesRows = (index: number) =>
		endsInRow(index - 1) && shownLayouts(index)[0] === "row";
	const statusFollowsRow = () =>
		endsInRow(
			chat.messages.findLastIndex(
				(message, index) =>
					message.role === "user" || shownLayouts(index).length > 0,
			),
		);
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
		const { message, agentKey, approvalMode, modelSelection } =
			location.state ?? {};
		if (!message) return;
		navigate(location.pathname, { replace: true, state: {} });
		if (agentKey) {
			try {
				await createConversation.action.mutateAsync({
					id: params.conversationId,
					agentKey,
					approvalMode,
					modelSelection,
				});
			} catch {
				navigate("/lucid/agent", {
					replace: true,
					state: { message, approvalMode, modelSelection },
				});
				return;
			}
			setCreating(false);
		}
		//* a message the agent did not accept goes into the chat box to try again
		if (!(await chat.send(message))) composer?.insert(message);
	});
	createEffect(() => {
		if (!selectedId()) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape" && !event.defaultPrevented) {
				setSelectedId(undefined);
			}
		};
		window.addEventListener("keydown", onKeyDown);
		onCleanup(() => window.removeEventListener("keydown", onKeyDown));
	});
	createEffect(
		on(
			() => params.conversationId,
			() => {
				setSelectedId(undefined);
				setRedirecting(undefined);
				setRunsOpen(false);
				scroll.scrollToEnd();
			},
			{ defer: true },
		),
	);

	// ----------------------------------------
	// Render
	return (
		<AgentTranscriptContext.Provider
			value={{ selected: selectedId, select: setSelectedId, sidebar }}
		>
			<div
				data-agent-chat
				class="flex h-[calc(100dvh-4.25rem)] flex-col overflow-hidden rounded-t-xl border-x border-t border-border bg-background md:h-[calc(100dvh-1rem)]"
			>
				<AgentChatHeader
					conversation={conversation()}
					actions={
						<AgentChatActions
							routineCard={
								routine()
									? {
											open: routineCardOpen(),
											onToggle: () => setRoutineCardOpen((open) => !open),
										}
									: undefined
							}
							details={{
								open: detailsOpen(),
								onToggle: () => setDetailsOpen(!detailsOpen()),
							}}
							onRename={() => setRenameOpen(true)}
							onDelete={() => setDeleteOpen(true)}
						/>
					}
				/>
				<div class="relative flex min-h-0 grow">
					<section
						class={classnames(
							"flex min-w-0 grow flex-col transition-[margin] duration-300 ease-out",
							{ "lg:me-96": sidebarOpen() },
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
								<div class="@container relative flex min-h-0 grow flex-col">
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
															data-chat-message={message.id}
															data-chat-role={message.role}
															class={classnames("flex flex-col", {
																"-mt-5": continuesRows(index()),
																hidden:
																	message.role !== "user" &&
																	shownLayouts(index()).length === 0,
															})}
														>
															<AgentMessage
																message={message}
																pendingInteractionId={
																	chat.pendingInteraction()?.id
																}
																onRespond={respond}
																selectedToolId={selectedId()}
																onSelectTool={selectTool}
																live={
																	chat.streaming() &&
																	index() === chat.messages.length - 1
																}
																working={
																	activity() === "row" &&
																	index() === chat.messages.length - 1
																}
															/>
														</div>
													</>
												)}
											</For>
											<Show when={compactions().trailing}>
												<AgentCompactionDivider />
											</Show>
											{/* laid out like a transcript row, as the agent's next step is often one; a shimmering row already shows the agent at work, so then it is only read out */}
											<Show when={activity()}>
												{(current) => (
													<div
														role="status"
														class={classnames(
															"agent-shimmer flex w-fit max-w-full items-center gap-2 py-1 text-xs text-muted",
															{
																"sr-only": current() === "row",
																"-mt-5": statusFollowsRow(),
															},
														)}
													>
														<span
															class="flex size-3.5 shrink-0 items-center justify-center"
															aria-hidden="true"
														>
															<FaSolidEllipsis size={10} />
														</span>
														{T()(
															current() === "retrying"
																? "agent.chat.retrying"
																: current() === "compacting"
																	? "agent.context.compacting"
																	: "agent.chat.thinking",
														)}
													</div>
												)}
											</Show>
											<Show
												when={
													!chat.streaming() &&
													latestRun()?.status === "cancelled"
												}
											>
												<p class="text-sm text-muted">
													{T()("agent.chat.stopped")}
												</p>
											</Show>
											<Show when={chat.error() ?? runError()}>
												{(message) => <AgentErrorNotice message={message()} />}
											</Show>
										</div>
									</div>
									<div
										aria-hidden="true"
										class="pointer-events-none absolute inset-x-0 -bottom-2.5 h-10.5 bg-linear-to-t from-background to-transparent"
									/>
									<AgentChatTimeline
										messages={chat.messages}
										viewport={scroll.viewport()}
										onSelect={scroll.scrollToMessage}
									/>
									<Show when={scroll.loadingEarlier()}>
										<div class="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
											<Spinner size="sm" variant="subtle" />
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
						<Show when={!chat.conversation.isError}>
							<div class="relative mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 md:px-6 md:pb-6">
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
										onEdit={
											activeWidget() ? undefined : (input) => void edit(input)
										}
										onCancel={(input) =>
											void chat.updateInput({ kind: "cancel", id: input.id })
										}
										onResume={() => void chat.updateInput({ kind: "resume" })}
										onClear={() => void chat.updateInput({ kind: "clear" })}
									/>
									<ErrorMessage
										theme="basic"
										message={updateConversation.errors()?.message}
									/>
									<AgentUnavailableNotice>
										<Show when={!activeWidget()}>
											<AgentComposer
												ref={(handle) => {
													composer = handle;
												}}
												class="agent-composer-morph"
												autofocus={true}
												draftKey={params.conversationId}
												disabled={!models.isSuccess}
												placeholder={T()(
													models.isError
														? "agent.composer.placeholder.unreachable"
														: chat.pendingInteraction()
															? "agent.composer.placeholder.instructions"
															: chat.working()
																? "agent.composer.placeholder.busy"
																: "agent.composer.placeholder",
												)}
												header={
													<Show when={chat.pendingInteraction()}>
														{(pending) => (
															<AgentInteractionBar
																title={pending().widget.interaction?.title}
																redirecting={true}
																onRedirect={
																	pending().widget.interaction?.placement ===
																	"composer"
																		? () => setRedirecting(undefined)
																		: undefined
																}
																onStop={() => void chat.stop()}
															/>
														)}
													</Show>
												}
												queueable={true}
												busy={chat.working()}
												onStop={
													chat.working() ? () => void chat.stop() : undefined
												}
												controls={
													<Show when={conversation()}>
														<AgentApprovalPicker
															routine={
																conversation()?.routineId
																	? {
																			disabled: !routine(),
																			onEdit: () => {
																				setFocusApprovals(true);
																				setRoutineOpen(true);
																			},
																		}
																	: undefined
															}
															value={
																conversation()?.approvalMode ?? "tool-defaults"
															}
															onChange={(approvalMode) =>
																updateConversation.action.mutate({
																	id: params.conversationId,
																	body: { approvalMode },
																})
															}
														/>
													</Show>
												}
												onSubmit={send}
												onEditLast={editLast}
												end={
													<>
														<Show when={chat.context()}>
															{(context) => (
																<AgentContextRing
																	context={context()}
																	busy={chat.working()}
																	onCompact={() => void chat.compact()}
																/>
															)}
														</Show>
														<Show when={conversation()}>
															{(current) => (
																<AgentModelPicker
																	agentKey={current().agentKey}
																	routineId={current().routineId ?? undefined}
																	value={current().modelSelection}
																	onChange={(modelSelection) =>
																		updateConversation.action.mutateAsync({
																			id: params.conversationId,
																			body: { modelSelection },
																		})
																	}
																/>
															)}
														</Show>
													</>
												}
											/>
										</Show>
										{/* kept while instructions are sent instead, so the form keeps its values */}
										<Show when={composerWidget()}>
											{(pending) => (
												<div
													class="max-h-[60vh] overflow-y-auto motion-safe:animate-rise-in"
													classList={{ hidden: !activeWidget() }}
												>
													<AgentWidget
														widget={pending().widget}
														view="composer"
														onRespond={respond}
														onRedirect={() => setRedirecting(pending().id)}
														onStop={() => void chat.stop()}
													/>
												</div>
											)}
										</Show>
									</AgentUnavailableNotice>
								</div>
							</div>
						</Show>
					</section>
					<Show when={sidebarOpen() && conversation()}>
						{(current) => (
							<AgentChatSidebar
								ref={setSidebar}
								conversation={current()}
								routine={routineCard()}
								detailsOpen={detailsOpen()}
								selectedTool={selectedTool()}
								onRoutineRuns={() => setRunsOpen(true)}
								onRoutineOpen={() => {
									setFocusApprovals(false);
									setRoutineOpen(true);
								}}
								onRoutineClose={() => setRoutineCardOpen(false)}
								onDetailsClose={() => setDetailsOpen(false)}
								onToolClose={() => setSelectedId(undefined)}
							/>
						)}
					</Show>
				</div>
				<RenameAgentConversationModal
					conversation={conversation}
					state={{ open: renameOpen(), setOpen: setRenameOpen }}
				/>
				<UpsertAgentRoutineDrawer
					focusApprovals={focusApprovals()}
					routine={routine}
					state={{ open: routineOpen(), setOpen: setRoutineOpen }}
				/>
				<ViewAgentRoutineRunsDrawer
					id={() => routine()?.id}
					state={{ open: runsOpen(), setOpen: setRunsOpen }}
				/>
				<DeleteAgentConversationModal
					id={() => params.conversationId}
					state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
					onDeleted={() => navigate("/lucid/agent")}
				/>
			</div>
		</AgentTranscriptContext.Provider>
	);
};

export default AgentConversationPage;
