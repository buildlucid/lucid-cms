import classnames from "classnames";
import { type Component, For, Match, Show, Switch } from "solid-js";
import AgentChatThumb from "@/components/AgentChatThumb/AgentChatThumb";
import HomeCard from "@/components/HomeCard/HomeCard";
import HomeCardItem from "@/components/HomeCardItem/HomeCardItem";
import type { HomeWidgetSize } from "@/components/HomeWidgets/types";
import Pill from "@/components/Pill/Pill";
import SkeletonListItems from "@/components/SkeletonListItems/SkeletonListItems";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";
import { getAgentName } from "@/utils/agent-access";
import { getAgentRunDisplay, isRunWorking } from "@/utils/agent-chat";
import dateHelpers from "@/utils/date-helpers";

/**
 * The user's latest agent chats. Each row leads with a dot for its last run,
 * and only runs waiting on the user get a labelled status.
 */
const AgentActivityWidget: Component<{ size: HomeWidgetSize }> = () => {
	// ----------------------------------------
	// Queries
	const conversations = api.agent.useGetConversations({
		queryParams: { perPage: 6 },
	});

	// ----------------------------------------
	// Render
	return (
		<HomeCard
			title={T()("home.widget.agent.label")}
			href="/lucid/agent/history"
		>
			<Switch
				fallback={
					<ul class="flex flex-col">
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
										<HomeCardItem
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
					</ul>
				}
			>
				<Match when={conversations.isLoading}>
					<ul class="flex flex-col">
						<SkeletonListItems />
					</ul>
				</Match>
				<Match when={conversations.isError}>
					<p class="flex min-h-9 items-center px-2 text-sm text-muted">
						{T()("home.widget.agent.error")}
					</p>
				</Match>
				<Match when={(conversations.data?.data.length ?? 0) === 0}>
					<p class="flex min-h-9 items-center px-2 text-sm text-muted">
						{T()("agent.home.empty.title")}
					</p>
				</Match>
			</Switch>
		</HomeCard>
	);
};

export default AgentActivityWidget;
