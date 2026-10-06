import classnames from "classnames";
import { type Component, For, Index, Show } from "solid-js";
import AgentChatThumb from "@/components/AgentChatThumb/AgentChatThumb";
import { getAgentRunDisplay } from "@/components/AgentRunStatus/AgentRunStatus";
import DashboardCard from "@/components/DashboardCard/DashboardCard";
import DashboardCardItem from "@/components/DashboardCardItem/DashboardCardItem";
import type { DashboardWidgetSize } from "@/components/DashboardWidget/types";
import Pill from "@/components/Pill/Pill";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import ViewAllLink from "@/components/ViewAllLink/ViewAllLink";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { isRunWorking } from "@/utils/agent-chat";
import dateHelpers from "@/utils/date-helpers";
import { canUseAskView, getNewChatHref } from "@/utils/home-view";

/**
 * The user's latest agent chats. Each row leads with a dot for its last run,
 * and only runs waiting on the user get a labelled status.
 */
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
					<div class="flex min-h-9 items-center justify-between gap-3 px-2">
						<p class="text-sm text-muted">{T()("agent.home.empty.title")}</p>
						<Show when={canUseAskView()}>
							<ViewAllLink
								href={getNewChatHref()}
								label={T()("agent.chat.new")}
							/>
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
									<li class="flex items-center gap-3 px-2 py-2">
										<span class="skeleton block h-9 w-7 shrink-0" />
										<span class="flex grow flex-col gap-1.5">
											<span class="skeleton block h-3.5 w-1/2" />
											<span class="skeleton block h-3 w-1/3" />
										</span>
									</li>
								)}
							</Index>
						}
					>
						<For each={conversations.data?.data}>
							{(conversation) => {
								const display = () =>
									conversation.latestRun
										? getAgentRunDisplay(
												conversation.latestRun.status,
												conversation.latestRun.outcome,
											)
										: undefined;

								return (
									<li>
										<DashboardCardItem
											href={`/lucid/agent/chats/${conversation.id}`}
											title={conversation.title}
											description={[
												getAgentName(conversation.agentKey),
												conversation.routineId
													? T()("agent.routine.run")
													: undefined,
											]
												.filter(Boolean)
												.join(" · ")}
											thumb={
												<span class="relative flex">
													<AgentChatThumb />
													<StatusIndicator
														variant={display()?.variant ?? "neutral-subtle"}
														label={display()?.label}
														class={classnames(
															"absolute -right-1 -bottom-0.5 ring-2 ring-card",
															{
																"animate-pulse": isRunWorking(
																	conversation.latestRun?.status,
																),
															},
														)}
													/>
												</span>
											}
											meta={
												<Show
													when={display()?.attention && display()}
													fallback={dateHelpers.formatRelativeDate(
														conversation.updatedAt,
													)}
												>
													{(attention) => (
														<Pill size="xs" variant={attention().variant}>
															{attention().label}
														</Pill>
													)}
												</Show>
											}
										/>
									</li>
								);
							}}
						</For>
					</Show>
				</ul>
			</Show>
		</DashboardCard>
	);
};

export default AgentActivityWidget;
