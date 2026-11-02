import { useQueryClient } from "@tanstack/solid-query";
import type { AiUsageSession } from "@types";
import {
	TbOutlineCalendar,
	TbOutlineChartBar,
	TbOutlineCoins,
	TbOutlineLetterT,
	TbOutlineListNumbers,
	TbOutlineUser,
} from "solid-icons/tb";
import { type Component, createMemo, Index, Show } from "solid-js";
import AiUsageSessionTableRow from "@/components/AiUsageSessionTableRow/AiUsageSessionTableRow";
import InfoRow from "@/components/InfoRow/InfoRow";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import StateNote from "@/components/StateNote/StateNote";
import Table from "@/components/Table/Table";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import { getAiUsageSessionTypeOptions } from "@/utils/ai-usage";

export const AiUsageSessionList: Component<{
	state: {
		searchParams: QueryStateResponse;
	};
	onOpen: (session: AiUsageSession) => void;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const queryClient = useQueryClient();

	// ----------------------------------
	// Queries
	const sessions = api.ai.useGetUsageSessions({
		queryParams: {
			queryString: props.state.searchParams.queryString,
		},
		enabled: () => props.state.searchParams.ready(),
	});

	// ----------------------------------------
	// Memos
	const sessionTypeOptions = createMemo(() => getAiUsageSessionTypeOptions());
	const showingState = createMemo(
		() => sessions.isError || sessions.data?.data.length === 0,
	);
	const showToolbar = createMemo(
		() => !showingState() || !props.state.searchParams.filtersAreDefault(),
	);

	// ----------------------------------------
	// Render
	return (
		<>
			{/* the query toolbar sits above the card, which holds only the table and pagination */}
			<div class="flex flex-col gap-3">
				{/* nothing to filter until there are sessions or filters are set */}
				<Show when={showToolbar()}>
					<QueryToolbar
						queryState={props.state.searchParams}
						onRefresh={() => {
							queryClient.invalidateQueries({
								queryKey: queryKeys.ai.usage(),
							});
							queryClient.invalidateQueries({
								queryKey: queryKeys.ai.credits(),
							});
						}}
						filterSubject={T()("ai.usage.sessions.title")}
						filterFields={[
							{
								label: T()("ai.usage.session.type"),
								key: "sessionType",
								type: "select",
								options: sessionTypeOptions(),
							},
							{
								label: T()("common.user"),
								key: "userId",
								type: "user",
							},
							{
								label: T()("common.request.id"),
								key: "requestId",
								type: "text",
							},
						]}
						sorts={[
							{
								label: T()("ai.usage.last.activity"),
								key: "lastActivityAt",
							},
							{
								label: T()("ai.usage.credits"),
								key: "credits",
							},
							{
								label: T()("ai.usage.metrics.totalTokens"),
								key: "totalTokens",
							},
						]}
						perPage={[10, 20, 40]}
						padding="none"
					/>
				</Show>
				<InfoRow.Content padding="none">
					<QueryBoundary
						appearance="inline"
						error={sessions.isError}
						onRetry={() => sessions.refetch()}
						empty={sessions.data?.data.length === 0}
						queryState={props.state.searchParams}
						emptyFallback={
							<StateNote>{T()("empty.states.ai.usage.note")}</StateNote>
						}
						class={showingState() ? "p-4" : undefined}
					>
						<Table.Root
							id="ai-usage.sessions"
							rowCount={sessions.data?.data.length || 0}
							queryState={props.state.searchParams}
							columns={[
								{
									label: T()("ai.usage.session"),
									key: "session",
									icon: <TbOutlineLetterT />,
									minWidth: 240,
								},
								{
									label: T()("common.user"),
									key: "user",
									icon: <TbOutlineUser />,
								},
								{
									label: T()("ai.usage.credits"),
									key: "credits",
									icon: <TbOutlineCoins />,
									sortable: true,
								},
								{
									label: T()("ai.usage.usage"),
									key: "usage",
									icon: <TbOutlineChartBar />,
									minWidth: 220,
								},
								{
									label: T()("ai.usage.requests"),
									key: "requests",
									icon: <TbOutlineListNumbers />,
								},
								{
									label: T()("ai.usage.last.activity"),
									key: "lastActivityAt",
									icon: <TbOutlineCalendar />,
									sortable: true,
									minWidth: 170,
								},
							]}
							loading={sessions.isFetching}
							padding="sm"
							variant="contained"
							class="border-y-0"
						>
							<Index each={sessions.data?.data || []}>
								{(session, i) => (
									<AiUsageSessionTableRow
										index={i}
										session={session()}
										onOpen={props.onOpen}
									/>
								)}
							</Index>
						</Table.Root>
					</QueryBoundary>
					<Pagination
						queryState={props.state.searchParams}
						meta={sessions.data?.meta}
						variant="footer"
						padding="sm"
						hideWhenEmpty
					/>
				</InfoRow.Content>
			</div>
		</>
	);
};
