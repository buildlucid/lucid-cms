import type { AgentConversation } from "@types";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import WebSourceRow from "@/components/AgentToolPanel/parts/WebSourceRow";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import dateHelpers from "@/utils/date-helpers";
import AgentCardDetail from "./AgentCardDetail";
import AgentCardHeader from "./AgentCardHeader";

const shownSources = 3;

const AgentChatDetailsCard: Component<{
	conversation: AgentConversation;
	onClose: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [showAll, setShowAll] = createSignal(false);
	const details = api.agent.useGetConversationDetails({
		id: () => props.conversation.id,
	});

	// ----------------------------------------
	// Memos
	const data = createMemo(() =>
		details.isSuccess ? details.data.data : undefined,
	);
	const sources = createMemo(() => data()?.sources ?? []);
	const visibleSources = createMemo(() =>
		showAll() ? sources() : sources().slice(0, shownSources),
	);

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-labelledby="agent-chat-details-title"
			class="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 animate-fade-in"
		>
			<AgentCardHeader
				id="agent-chat-details-title"
				label={T()("agent.chat.details.title")}
				title={props.conversation.title}
				onClose={props.onClose}
			/>
			<dl class="flex flex-col gap-2 text-xs">
				<AgentCardDetail label={T()("agent.chat.details.agent")}>
					{getAgentName(props.conversation.agentKey)}
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.approval.mode.label")}>
					{T()(`agent.approval.mode.${props.conversation.approvalMode}`)}
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.chat.details.started")}>
					<Timestamp value={props.conversation.createdAt} />
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.chat.details.updated")}>
					<Timestamp value={props.conversation.updatedAt} />
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.chat.details.credits")}>
					<Show when={data()} fallback={<UsagePlaceholder />}>
						{(current) => current().usage.creditsCharged}
					</Show>
				</AgentCardDetail>
				<AgentCardDetail label={T()("agent.chat.details.calls")}>
					<Show when={data()} fallback={<UsagePlaceholder />}>
						{(current) =>
							T()("agent.chat.details.calls.value", {
								model: current().usage.modelCalls,
								web: current().usage.webCalls,
							})
						}
					</Show>
				</AgentCardDetail>
			</dl>
			<section
				aria-labelledby="agent-chat-sources-title"
				class="flex flex-col gap-1.5 border-t border-border pt-4"
			>
				<h4
					id="agent-chat-sources-title"
					class="flex items-baseline justify-between text-xs text-muted"
				>
					{T()("agent.chat.details.sources")}
					<Show when={sources().length > 0}>
						<span class="tabular-nums">{sources().length}</span>
					</Show>
				</h4>
				<Switch>
					<Match when={details.isError}>
						<p class="text-xs text-muted">
							{T()("agent.chat.details.unavailable")}
						</p>
					</Match>
					<Match when={!data()}>
						<span class="skeleton block h-8 w-full" />
					</Match>
					<Match when={sources().length === 0}>
						<p class="text-xs text-muted">
							{T()("agent.chat.details.sources.none")}
						</p>
					</Match>
					<Match when={true}>
						<ul class="flex flex-col">
							<For each={visibleSources()}>
								{(source) => (
									<li>
										<WebSourceRow url={source.url} title={source.title} />
									</li>
								)}
							</For>
						</ul>
						<Show when={sources().length > shownSources}>
							<button
								type="button"
								class="self-start rounded text-[11px] text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
								aria-expanded={showAll()}
								onClick={() => setShowAll((value) => !value)}
							>
								{showAll()
									? T()("common.show_less")
									: T()("agent.tool.group.show", {
											count: sources().length - shownSources,
										})}
							</button>
						</Show>
					</Match>
				</Switch>
			</section>
		</aside>
	);
};

const Timestamp: Component<{ value: string | null }> = (props) => (
	<time
		datetime={props.value ?? undefined}
		title={dateHelpers.formatFullDate(props.value, { includeTime: true })}
	>
		{dateHelpers.formatTimestamp(props.value)}
	</time>
);

const UsagePlaceholder: Component = () => (
	<span class="skeleton block h-3.5 w-12" />
);

export default AgentChatDetailsCard;
