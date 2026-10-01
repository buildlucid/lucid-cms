import { useLocation, useNavigate } from "@solidjs/router";
import type { Agent, AgentApprovalMode, AiModelSelection } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	onMount,
	Show,
} from "solid-js";
import AgentApprovalPicker from "@/components/AgentApprovalPicker/AgentApprovalPicker";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import useFirstPaint from "@/hooks/useFirstPaint/useFirstPaint";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import userStore from "@/store/userStore/userStore";
import T, { translateAdminCopy } from "@/translations";
import {
	getAgentAccess,
	getAgentUnavailableReason,
} from "@/utils/agent-access";
import type { AgentReferenceItem } from "@/utils/agent-references";
import { startViewTransition } from "@/utils/view-transition";
import AgentPicker from "./parts/AgentPicker";
import AgentSuggestionButton from "./parts/AgentSuggestionButton";
import AgentWaitingChats from "./parts/AgentWaitingChats";

const grownHeight = 96;

/**
 * The agent's home: a greeting, a chat box that starts a new chat, suggestions
 * and the chats waiting on the reader. Sending opens the chat straight away and
 * the chat page saves it, so there is no wait here.
 */
const AgentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation<{
		message?: string;
		references?: AgentReferenceItem[];
		approvalMode?: AgentApprovalMode;
		modelSelection?: AiModelSelection;
	}>();
	const navigate = useNavigate();
	const returned = location.state?.message;
	const returnedReferences = location.state?.references;
	const [modelSelection, setModelSelection] =
		createSignal<AiModelSelection | null>(
			location.state?.modelSelection ?? null,
		);
	const [approvalMode, setApprovalMode] = createSignal<AgentApprovalMode>(
		location.state?.approvalMode ?? "tool-defaults",
	);
	const [composerBlank, setComposerBlank] = createSignal(true);
	const painted = useFirstPaint();
	const definitions = api.agent.useGetDefinitions();

	// ----------------------------------------
	// Memos
	const agents = createMemo(() => {
		const usable = new Set(getAgentAccess().use.map((agent) => agent.key));
		return (
			definitions.data?.data.agents.filter((agent) => usable.has(agent.key)) ??
			[]
		);
	});
	const unavailable = createMemo(
		() => getAgentUnavailableReason() !== undefined,
	);
	const agent = createMemo(
		() =>
			agents().find(
				(agent) => agent.key === userPreferencesStore.getAgentKey(),
			) ?? agents()[0],
	);
	const hasSuggestions = createMemo(
		() => (agent()?.suggestions.length ?? 0) > 0,
	);
	const showSuggestions = createMemo(() => hasSuggestions() && composerBlank());
	//* the last agent's suggestions stay while their space closes, rather than vanishing first
	const shownSuggestions = createMemo<Agent["suggestions"]>(
		(previous) => (hasSuggestions() ? (agent()?.suggestions ?? []) : previous),
		[],
	);
	const models = api.agent.useGetModels({ agentKey: () => agent()?.key });
	const waitingAgentKey = createMemo(() =>
		agents().length > 1 ? agent()?.key : undefined,
	);
	const waiting = api.agent.useGetConversations({
		queryParams: {
			filters: { status: "waiting", agentKey: waitingAgentKey },
			perPage: 3,
		},
		enabled: () => definitions.isSuccess,
	});
	const name = createMemo(() => {
		const user = userStore.get.user;
		return user?.firstName || user?.username;
	});

	// ----------------------------------------
	// Functions
	const start = (
		text: string,
		_mode: "send" | "steer" = "send",
		references: AgentReferenceItem[] = [],
	) => {
		const selected = agent();
		if (
			!selected ||
			!definitions.data?.data.enabled ||
			unavailable() ||
			!models.isSuccess
		) {
			return false;
		}

		startViewTransition(
			() =>
				navigate(`/lucid/agent/chats/${crypto.randomUUID()}`, {
					state: {
						message: text,
						references,
						agentKey: selected.key,
						approvalMode: approvalMode(),
						modelSelection: modelSelection() ?? undefined,
					},
				}),
			{ ready: "[data-agent-chat] .agent-composer-morph" },
		);
		return true;
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		void import("@/containers/AgentConversationPage/AgentConversationPage");
		if (returned !== undefined) {
			navigate(location.pathname, { replace: true, state: {} });
		}
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Body padding="md" class="blur-background">
				<QueryBoundary
					class="w-full"
					loading={definitions.isLoading}
					error={definitions.isError}
					empty={!definitions.data?.data.enabled || agents().length === 0}
				>
					<Show when={agent()}>
						{(current) => (
							<section class="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-[18vh] pb-10">
								<div class="flex flex-col items-center gap-1.5 text-center">
									<h2 class="text-2xl font-medium text-title">
										{name()
											? T()("agent.home.greeting", { name: name() })
											: T()("agent.home.greeting.anonymous")}
									</h2>
									<p class="text-base text-body">{T()("agent.home.title")}</p>
								</div>
								<AgentUnavailableNotice>
									<div class="flex flex-col">
										<AgentComposer
											ref={(handle: AgentComposerHandle) => {
												if (returned !== undefined) {
													handle.insert(returned, returnedReferences);
												}
											}}
											class="agent-composer-morph"
											size="lg"
											grow={showSuggestions() ? 0 : grownHeight}
											autofocus={true}
											onBlankChange={setComposerBlank}
											disabled={!models.isSuccess}
											placeholder={T()(
												models.isError
													? "agent.composer.placeholder.unreachable"
													: "agent.composer.placeholder",
											)}
											draftKey="new"
											agentKey={current().key}
											features={current().features}
											capabilities={current().capabilities}
											onSubmit={start}
											controls={
												<AgentApprovalPicker
													value={approvalMode()}
													onChange={setApprovalMode}
												/>
											}
											start={
												<Show when={agents().length > 1}>
													<AgentPicker
														agents={agents()}
														selected={current()}
														onSelect={(agent) => {
															userPreferencesStore.setAgentKey(agent.key);
															setModelSelection(null);
														}}
													/>
												</Show>
											}
											end={
												<AgentModelPicker
													agentKey={current().key}
													value={modelSelection()}
													onChange={setModelSelection}
												/>
											}
										/>
										<div
											class={classnames("grid", {
												"transition-[grid-template-rows,opacity] duration-300 ease-emphasized motion-reduce:transition-none":
													painted(),
												"grid-rows-[1fr]": showSuggestions(),
												"grid-rows-[0fr] opacity-0": !showSuggestions(),
											})}
											inert={!showSuggestions()}
										>
											<div class="min-h-0 overflow-hidden">
												<div class="flex flex-col gap-2.5 pt-6">
													<p class="px-1 text-xs text-muted">
														{T()("agent.home.suggestions")}
													</p>
													<ul class="grid gap-2.5 sm:grid-cols-2">
														<For each={shownSuggestions()}>
															{(suggestion) => (
																<AgentSuggestionButton
																	suggestion={suggestion}
																	disabled={!models.isSuccess}
																	onSelect={() => {
																		void start(
																			translateAdminCopy(suggestion.message),
																		);
																	}}
																/>
															)}
														</For>
													</ul>
												</div>
											</div>
										</div>
										<AgentWaitingChats
											class="pt-6"
											agentKey={waitingAgentKey()}
											conversations={waiting.data?.data ?? []}
											total={
												waiting.data?.meta.total ??
												waiting.data?.data.length ??
												0
											}
										/>
									</div>
								</AgentUnavailableNotice>
							</section>
						)}
					</Show>
				</QueryBoundary>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default AgentPage;
