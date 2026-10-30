import { useLocation, useNavigate } from "@solidjs/router";
import type { Agent, AgentConfirmationMode } from "@types";
import classnames from "classnames";
import {
	type Accessor,
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
//* room for about three lines, so a long placeholder never runs out of the narrow panel's box
const panelGrow = 80;

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

		const { id, created } = session.start({
			text,
			references,
			agentKey: selected.key,
			confirmationMode: confirmationMode(),
			modelSelection: modelSelection() ?? undefined,
		});
		//* the panel shows the new chat in place
		if (panel()) return true;

		const href = `/admin/agent/chats/${id}`;
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

	const renderGreeting = () => (
		<div class="flex flex-col items-center gap-1.5 text-center">
			<h2
				class={classnames(
					"font-medium text-title",
					panel() ? "text-base" : "text-2xl",
				)}
			>
				{greeting()}
			</h2>
			<p class={classnames("text-body", panel() ? "text-sm" : "text-base")}>
				{T()("agent.home.title")}
			</p>
		</div>
	);
	//* takes an accessor, so switching agents updates the box rather than rebuilding it
	const renderComposer = (current: Accessor<Agent>) => (
		<AgentComposer
			ref={setComposer}
			class="agent-composer-morph"
			size={panel() ? "md" : "lg"}
			grow={panel() ? panelGrow : showSuggestions() ? 0 : grownHeight}
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
						onSelect={(agent) => userPreferencesStore.setAgentKey(agent.key)}
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
	);
	const renderSuggestions = () => (
		<div class="flex flex-col gap-2.5">
			<Show when={!panel()}>
				<p class="px-1 text-xs text-muted">{T()("agent.home.suggestions")}</p>
			</Show>
			<ul
				class={
					panel()
						? "flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/50"
						: "grid gap-2.5 sm:grid-cols-2"
				}
			>
				<For each={shownSuggestions()}>
					{(suggestion) => (
						<AgentSuggestionButton
							suggestion={suggestion}
							disabled={!models.isSuccess}
							compact={panel()}
							onSelect={() => {
								void start(translateAdminCopy(suggestion.message));
							}}
						/>
					)}
				</For>
			</ul>
		</div>
	);

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
			class={classnames("w-full grow", { "min-h-0": panel() })}
			loading={definitions.isLoading}
			loadingFallback={
				//* match the greeting line heights and chat box to avoid a layout shift
				<Show
					when={panel()}
					fallback={
						<section
							aria-busy="true"
							class="mx-auto flex w-full max-w-3xl flex-col gap-8 self-start pt-[18vh] pb-10"
						>
							<div class="flex flex-col items-center gap-1.5">
								<div class="text-2xl">
									<span class="skeleton block w-48">&nbsp;</span>
								</div>
								<p class="text-base">
									<span class="skeleton block w-72 max-w-full">&nbsp;</span>
								</p>
							</div>
							<span class="skeleton block h-32 w-full rounded-2xl" />
						</section>
					}
				>
					<section aria-busy="true" class="flex w-full grow flex-col">
						<div class="my-auto flex flex-col items-center gap-1.5 px-5 py-6">
							<div class="text-base">
								<span class="skeleton block w-48">&nbsp;</span>
							</div>
							<p class="text-sm">
								<span class="skeleton block w-72 max-w-full">&nbsp;</span>
							</p>
						</div>
						<div class="px-3 pb-3">
							<span class="skeleton block h-36 w-full rounded-2xl" />
						</div>
					</section>
				</Show>
			}
			error={definitions.isError}
			empty={!definitions.data?.data.enabled || agents().length === 0}
		>
			<Show when={agent()}>
				{(current) => (
					<Show
						when={panel()}
						fallback={
							<section class="mx-auto flex w-full max-w-3xl flex-col gap-8 pt-[18vh] pb-10">
								{renderGreeting()}
								<AgentUnavailableNotice>
									<div class="flex flex-col">
										{renderComposer(current)}
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
												<div class="pt-6">{renderSuggestions()}</div>
											</div>
										</div>
										<AgentWaitingChats
											agentKey={waitingAgentKey()}
											class="pt-6"
										/>
									</div>
								</AgentUnavailableNotice>
							</section>
						}
					>
						<section class="flex min-h-0 w-full grow flex-col">
							{/* centred in the space above the chat box, scrolling when it runs out */}
							<div class="flex min-h-0 grow flex-col overflow-y-auto scrollbar px-5 py-6">
								<div class="my-auto flex flex-col gap-6">
									{renderGreeting()}
									<Show when={hasSuggestions() && !unavailable()}>
										{renderSuggestions()}
									</Show>
								</div>
							</div>
							<div class="shrink-0 px-3 pb-3">
								<AgentUnavailableNotice>
									{renderComposer(current)}
								</AgentUnavailableNotice>
							</div>
						</section>
					</Show>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default AgentHome;
