import { useLocation, useNavigate, useParams } from "@solidjs/router";
import type { AgentInput } from "@types";
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
import Alert from "@/components/Alert/Alert";
import Button from "@/components/Button/Button";
import DeleteAgentConversationModal from "@/components/DeleteAgentConversationModal/DeleteAgentConversationModal";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoadingState from "@/components/LoadingState/LoadingState";
import PageLayout from "@/components/PageLayout/PageLayout";
import RenameAgentConversationModal from "@/components/RenameAgentConversationModal/RenameAgentConversationModal";
import Spinner from "@/components/Spinner/Spinner";
import useAgentChat from "@/hooks/useAgentChat/useAgentChat";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { placeCompactions } from "@/utils/agent-chat";

//* how close to the bottom the page must be to follow new output
const followThreshold = 160;

/** A single chat with the agent: its history, live replies, questions and the composer. */
const AgentConversationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams<{ conversationId: string }>();
	const location = useLocation<{ message?: string }>();
	const navigate = useNavigate();
	const chat = useAgentChat(() => params.conversationId);
	const [renameOpen, setRenameOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
	let following = true;
	let composer: AgentComposerHandle | undefined;

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.conversation.data?.data);
	const latestRun = createMemo(() => conversation()?.latestRun);
	const description = createMemo(() => {
		const current = conversation();
		if (!current) return undefined;
		const agent = getAgentName(current.agentKey);
		return current.routineId ? `${agent} · ${T()("agent.routine.run")}` : agent;
	});
	const compactions = createMemo(() =>
		placeCompactions(chat.messages, chat.compactions()),
	);
	const placeholder = createMemo(() => {
		switch (chat.pendingQuestion()?.kind) {
			case "question":
				return T()("agent.composer.placeholder.answer");
			case "approval":
				return T()("agent.composer.placeholder.redirect");
			default:
				return T()(
					chat.working()
						? "agent.composer.placeholder.busy"
						: "agent.composer.placeholder",
				);
		}
	});
	const runError = createMemo(() => {
		const run = latestRun();
		return !chat.streaming() && run?.status === "failed"
			? run.errorMessage
			: undefined;
	});

	// ----------------------------------------
	// Functions
	/** Answers a waiting question; typed text for an approval redirects the run instead of approving it. */
	const submit = (text: string, mode: "send" | "steer") => {
		const question = chat.pendingQuestion();
		if (question?.kind === "question") return chat.respond(question, text);
		return chat.send(text, question ? "steer" : mode);
	};
	const answer = (text: string) => {
		const question = chat.pendingQuestion();
		if (question) void chat.respond(question, text);
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
	//* a marker before the first loaded message may belong to an earlier page
	const compactedBefore = (id: string, index: number) =>
		compactions().before.has(id) && !(index === 0 && chat.history.hasNextPage);
	const scrollToEnd = () =>
		window.scrollTo({ top: document.documentElement.scrollHeight });

	// ----------------------------------------
	// Effects
	onMount(() => {
		//* a chat started from the agent home arrives with its first message
		const message = location.state?.message;
		if (!message) return;
		navigate(location.pathname, { replace: true, state: {} });
		void chat.send(message);
	});
	onMount(() => {
		const onScroll = () => {
			following =
				window.innerHeight + window.scrollY >=
				document.documentElement.scrollHeight - followThreshold;
		};
		window.addEventListener("scroll", onScroll, { passive: true });
		onCleanup(() => window.removeEventListener("scroll", onScroll));
	});
	//* a new question needs an answer, so the chat box is ready for it
	createEffect(
		on(
			() => chat.pendingQuestion()?.id,
			(id) => {
				if (id) composer?.focus();
			},
			{ defer: true },
		),
	);
	//* keeps the latest output in view while replies and widgets render
	const follow = new ResizeObserver(() => {
		if (following) scrollToEnd();
	});
	onCleanup(() => follow.disconnect());

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={conversation()?.title}
				description={description()}
				actions={
					<>
						<Link variant="outline" size="sm" href="/lucid/agent">
							{T()("agent.chat.new")}
						</Link>
						<ActionMenu
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
					</>
				}
			/>
			<PageLayout.Body>
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
						<LoadingState />
					</Match>
					<Match when={true}>
						<div class="mx-auto flex w-full max-w-3xl grow flex-col px-4 md:px-6">
							<div
								ref={(element) => follow.observe(element)}
								class="flex grow flex-col gap-6 py-8"
							>
								<Show when={chat.history.hasNextPage}>
									<Button
										variant="ghost"
										size="sm"
										class="self-center"
										loading={chat.history.isFetchingNextPage}
										onClick={() => void chat.history.fetchNextPage()}
									>
										{T()("agent.chat.earlier")}
									</Button>
								</Show>
								<For each={chat.messages}>
									{(message, index) => (
										<>
											<Show when={compactedBefore(message.id, index())}>
												<AgentCompactionDivider />
											</Show>
											<AgentMessage
												message={message}
												pendingQuestionId={chat.pendingQuestion()?.id}
												onAnswer={answer}
											/>
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
										{latestRun()?.status === "interrupted" && !chat.streaming()
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
									<p class="text-sm text-muted">{T()("agent.chat.stopped")}</p>
								</Show>
								<Show when={chat.error() ?? runError()}>
									{(message) => <Alert variant="danger">{message()}</Alert>}
								</Show>
							</div>
							<div class="sticky bottom-0 bg-linear-to-t from-background from-70% to-transparent pt-6 pb-4 md:pb-6">
								<AgentComposer
									ref={(handle) => {
										composer = handle;
									}}
									autofocus={true}
									draftKey={params.conversationId}
									placeholder={placeholder()}
									queueable={true}
									busy={chat.working()}
									onStop={
										chat.working() || chat.pendingQuestion()
											? () => void chat.stop()
											: undefined
									}
									onSubmit={submit}
									onEditLast={editLast}
									top={
										<AgentComposerStack
											inputs={chat.inputs}
											paused={chat.queuePaused()}
											question={chat.pendingQuestion()}
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
											onEdit={(input) => void edit(input)}
											onCancel={(input) =>
												void chat.updateInput({ kind: "cancel", id: input.id })
											}
											onResume={() => void chat.updateInput({ kind: "resume" })}
											onClear={() => void chat.updateInput({ kind: "clear" })}
										/>
									}
									end={
										<Show when={chat.context()}>
											{(context) => (
												<AgentContextRing
													context={context()}
													busy={
														chat.working() || Boolean(chat.pendingQuestion())
													}
													onCompact={() => void chat.compact()}
												/>
											)}
										</Show>
									}
								/>
							</div>
						</div>
					</Match>
				</Switch>
			</PageLayout.Body>
			<RenameAgentConversationModal
				conversation={conversation}
				state={{ open: renameOpen(), setOpen: setRenameOpen }}
			/>
			<DeleteAgentConversationModal
				id={() => params.conversationId}
				state={{ open: deleteOpen(), setOpen: setDeleteOpen }}
				onDeleted={() => navigate("/lucid/agent")}
			/>
		</PageLayout.Root>
	);
};

export default AgentConversationPage;
