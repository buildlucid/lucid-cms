import { useLocation, useNavigate } from "@solidjs/router";
import type { Agent, AgentConfirmationMode } from "@types";
import classnames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onMount,
	Show,
} from "solid-js";
import AgentComposer, {
	type AgentComposerHandle,
} from "@/components/AgentComposer/AgentComposer";
import AgentConfirmationPicker from "@/components/AgentConfirmationPicker/AgentConfirmationPicker";
import AgentModelPicker from "@/components/AgentModelPicker/AgentModelPicker";
import AgentUnavailableNotice from "@/components/AgentUnavailableNotice/AgentUnavailableNotice";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { useAgentSession } from "@/hooks/useAgentSession/useAgentSession";
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
import { getNewChatHref } from "@/utils/home-view";
import { startViewTransition } from "@/utils/view-transition";

import AgentPicker from "./parts/AgentPicker";
import AgentSuggestionButton from "./parts/AgentSuggestionButton";
import AgentWaitingChats from "./parts/AgentWaitingChats";

const grownHeight = 96;
//* the panel's box holds the current page pill too, so it keeps some room while suggestions show
const panelSuggestionsHeight = 32;

/**
 * The agent's home: a greeting, a chat box that starts a new chat, suggestions
 * and the chats waiting on the reader. Sending opens the chat straight away
 * while it saves, so there is no wait here. Shown on the agent page, on Home's
 * Ask view and, more compactly, in the agent panel, where chats open in place.
 */
const AgentHome: Component<{
	/** @default "page" */
	variant?: "page" | "panel";
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const session = useAgentSession();
	const [confirmationMode, setConfirmationMode] =
		createSignal<AgentConfirmationMode>("tool-defaults");
	const [composerBlank, setComposerBlank] = createSignal(true);
	const [composer, setComposer] = createSignal<AgentComposerHandle>();
	const painted = useFirstPaint();
	const definitions = api.agent.useGetDefinitions();

	// ----------------------------------------
	// Memos
	const agents = createMemo(() => {
		const access = getAgentAccess();
		const usable = new Set(
			(props.variant === "panel" ? access.sidebar : access.chat).map(
				(agent) => agent.key,
			),
		);
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
			userPreferencesStore.getAgentModelSelection(key),
		);
	});
	const panel = createMemo(() => props.variant === "panel");
	const greeting = createMemo(getGreeting);
	//* the panel only lists its agents' chats, as other agents are kept out of the sidebar
	const waitingAgentKey = createMemo(() =>
		agents().length > 1 || panel() ? agent()?.key : undefined,
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

		const { id, created } = session.start({
			text,
			references,
			agentKey: selected.key,
			confirmationMode: confirmationMode(),
			modelSelection: modelSelection() ?? undefined,
		});
		//* the panel shows the new chat in place
		if (panel()) return true;

		const href = `/lucid/agent/chats/${id}`;
		//* the chat route skips fetching a chat that arrives unsaved
		startViewTransition(() => navigate(href, { state: { unsaved: true } }), {
			ready: "[data-agent-chat] .agent-composer-morph",
		});
		//* a chat that could not be saved returns its message to this chat box
		void created.then((saved) => {
			if (!saved && location.pathname === href) {
				navigate(getNewChatHref(), { replace: true });
			}
		});
		return true;
	};

	// ----------------------------------------
	// Effects
	onMount(() => {
		if (!panel()) {
			void import("@/containers/AgentConversationPage/AgentConversationPage");
		}
	});
	createEffect(() => {
		const references = session.attached();
		const handle = composer();
		if (!handle || !references) return;
		session.takeAttached();
		handle.attach(references);
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
					<section
						class={classnames(
							"flex w-full flex-col",
							panel()
								? "my-auto gap-6 px-5 py-10"
								: "mx-auto max-w-3xl gap-8 pt-[18vh] pb-10",
						)}
					>
						<div class="flex flex-col items-center gap-1.5 text-center">
							<h2
								class={classnames(
									"font-medium text-title",
									panel() ? "text-base" : "text-2xl",
								)}
							>
								{greeting()}
							</h2>
							<p
								class={classnames(
									"text-body",
									panel() ? "text-sm" : "text-base",
								)}
							>
								{T()("agent.home.title")}
							</p>
						</div>
						<AgentUnavailableNotice>
							<div class="flex flex-col">
								<AgentComposer
									ref={setComposer}
									class="agent-composer-morph"
									size={panel() ? "md" : "lg"}
									grow={
										showSuggestions()
											? panel()
												? panelSuggestionsHeight
												: 0
											: grownHeight
									}
									autofocus={true}
									onBlankChange={setComposerBlank}
									disabled={!models.isSuccess}
									placeholder={T()(
										models.isError
											? "agent.composer.placeholder.unreachable"
											: "agent.composer.placeholder",
									)}
									draftKey="new"
									screen={session.screen.current()}
									agentKey={current().key}
									features={current().features}
									capabilities={current().capabilities}
									capabilityHints={!panel()}
									onSubmit={start}
									controls={
										<AgentConfirmationPicker
											value={confirmationMode()}
											onChange={setConfirmationMode}
										/>
									}
									start={
										<Show when={agents().length > 1}>
											<AgentPicker
												agents={agents()}
												selected={current()}
												onSelect={(agent) =>
													userPreferencesStore.setAgentKey(agent.key)
												}
											/>
										</Show>
									}
									end={
										<AgentModelPicker
											agentKey={current().key}
											value={modelSelection()}
											onChange={(selection) =>
												userPreferencesStore.setAgentModelSelection(
													current().key,
													selection,
												)
											}
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
											<ul
												class={classnames("grid gap-2.5", {
													"sm:grid-cols-2": !panel(),
												})}
											>
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
									agentKey={waitingAgentKey()}
									class="pt-6"
									onOpen={panel() ? session.open : undefined}
								/>
							</div>
						</AgentUnavailableNotice>
					</section>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default AgentHome;
