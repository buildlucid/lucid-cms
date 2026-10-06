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
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import useFirstPaint from "@/hooks/useFirstPaint/useFirstPaint";
import api from "@/services/api";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T, { translateAdminCopy } from "@/translations";
import {
	getAgentAccess,
	getAgentUnavailableReason,
} from "@/utils/agent-access";
import { getAvailableModelSelection } from "@/utils/agent-models";
import type { AgentReferenceItem } from "@/utils/agent-references";
import { getGreeting } from "@/utils/greeting";
import { startViewTransition } from "@/utils/view-transition";

import AgentPicker from "./parts/AgentPicker";
import AgentSuggestionButton from "./parts/AgentSuggestionButton";
import AgentWaitingChats from "./parts/AgentWaitingChats";

const grownHeight = 96;

/**
 * The agent's home: a greeting, a chat box that starts a new chat, suggestions
 * and the chats waiting on the reader. Sending opens the chat straight away and
 * the chat page saves it, so there is no wait here. Shown on the agent page
 * and on Home's Ask view.
 */
const AgentHome: Component = () => {
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
	const [returnedModelSelection, setReturnedModelSelection] =
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
		const usable = new Set(getAgentAccess().chat.map((agent) => agent.key));
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
	const modelSelection = createMemo(() => {
		const key = agent()?.key;
		if (!key || !models.isSuccess) return null;
		return getAvailableModelSelection(
			models.data.data,
			returnedModelSelection() ??
				userPreferencesStore.getAgentModelSelection(key),
		);
	});
	const greeting = createMemo(getGreeting);
	const waitingAgentKey = createMemo(() =>
		agents().length > 1 ? agent()?.key : undefined,
	);

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
		<QueryBoundary
			class="w-full grow"
			loading={definitions.isLoading}
			error={definitions.isError}
			empty={!definitions.data?.data.enabled || agents().length === 0}
		>
			<Show when={agent()}>
				{(current) => (
					<section class="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-[18vh] pb-10">
						<div class="flex flex-col items-center gap-1.5 text-center">
							<h2 class="text-2xl font-medium text-title">{greeting()}</h2>
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
													setReturnedModelSelection(null);
												}}
											/>
										</Show>
									}
									end={
										<AgentModelPicker
											agentKey={current().key}
											value={modelSelection()}
											onChange={(selection) => {
												userPreferencesStore.setAgentModelSelection(
													current().key,
													selection,
												);
												setReturnedModelSelection(null);
											}}
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
								<AgentWaitingChats agentKey={waitingAgentKey()} class="pt-6" />
							</div>
						</AgentUnavailableNotice>
					</section>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default AgentHome;
