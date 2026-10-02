import { type Component, For, Index, Show } from "solid-js";
import AgentRunStatus from "@/components/AgentRunStatus/AgentRunStatus";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import DashboardCardItem from "@/components/DashboardCardItem/DashboardCardItem";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import Link from "@/components/Link/Link";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import dateHelpers from "@/utils/date-helpers";
import { canUseAskView, getNewChatHref } from "@/utils/home-view";

const AgentActivityWidget: Component<{ size: DashboardWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const conversations = api.agent.useGetConversations({
		queryParams: { perPage: 6 },
	});

	// ----------------------------------------
	// Render
	return (
		<DashboardCard
			title={T()("home.widget.agent.label")}
			href="/lucid/agent/history"
		>
			<Show
				when={
					conversations.isLoading || (conversations.data?.data.length ?? 0) > 0
				}
				fallback={
					<div class="flex grow flex-col items-center justify-center gap-3 px-4 py-8 text-center">
						<p class="text-sm text-body">{T()("agent.home.empty.title")}</p>
						<Show when={canUseAskView()}>
							<Link href={getNewChatHref()} variant="outline" size="sm">
								{T()("agent.chat.new")}
							</Link>
						</Show>
					</div>
				}
			>
				<ul class="flex flex-col">
					<Show
						when={!conversations.isLoading}
						fallback={
							<Index each={[1, 2, 3]}>
								{() => (
									<li class="flex flex-col gap-1.5 px-2 py-2">
										<span class="skeleton block h-3.5 w-1/2" />
										<span class="skeleton block h-3 w-1/3" />
									</li>
								)}
							</Index>
						}
					>
						<For each={conversations.data?.data}>
							{(conversation) => (
								<li>
									<DashboardCardItem
										href={`/lucid/agent/chats/${conversation.id}`}
										title={conversation.title}
										description={[
											getAgentName(conversation.agentKey),
											dateHelpers.formatTimestamp(conversation.updatedAt),
										]
											.filter(Boolean)
											.join(" · ")}
										meta={
											conversation.latestRun ? (
												<AgentRunStatus
													status={conversation.latestRun.status}
													outcome={conversation.latestRun.outcome}
													size="xs"
												/>
											) : undefined
										}
									/>
								</li>
							)}
						</For>
					</Show>
				</ul>
			</Show>
		</DashboardCard>
	);
};

export default AgentActivityWidget;
