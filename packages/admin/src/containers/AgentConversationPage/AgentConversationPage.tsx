import { useLocation, useNavigate, useParams } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import AgentComposer from "@/components/AgentComposer/AgentComposer";
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

	// ----------------------------------------
	// Memos
	const conversation = createMemo(() => chat.conversation.data?.data);
	const latestRun = createMemo(() => conversation()?.latestRun);
	const approvalPending = createMemo(
		() => chat.pendingQuestion()?.kind === "approval",
	);
	const runError = createMemo(() => {
		const run = latestRun();
		return !chat.streaming() && run?.status === "failed"
			? run.errorMessage
			: undefined;
	});

	// ----------------------------------------
	// Functions
	const submit = (text: string) => {
		const question = chat.pendingQuestion();
		if (question) void chat.respond(question, text);
		else {
			void chat.send(text);
		}
	};
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
				description={
					conversation()?.routineId ? T()("agent.routine.run") : undefined
				}
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
									{(message) => (
										<AgentMessage
											message={message}
											pendingQuestionId={chat.pendingQuestion()?.id}
											onAnswer={submit}
										/>
									)}
								</For>
								<Show when={chat.working() && !chat.pendingQuestion()}>
									<p
										role="status"
										class="flex items-center gap-2 text-sm text-muted"
									>
										<Spinner size="sm" />
										{latestRun()?.status === "interrupted" && !chat.streaming()
											? T()("agent.chat.retrying")
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
									autofocus={true}
									placeholder={
										approvalPending()
											? T()("agent.composer.approval")
											: chat.pendingQuestion()
												? T()("agent.composer.reply")
												: T()("agent.composer.placeholder")
									}
									disabled={approvalPending()}
									busy={chat.working() && !chat.pendingQuestion()}
									onStop={() => void chat.stop()}
									onSubmit={submit}
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
