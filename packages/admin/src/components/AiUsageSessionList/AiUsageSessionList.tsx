import type { AiUsageSession } from "@types";
import classnames from "classnames";
import {
	FaSolidCalendar,
	FaSolidChartSimple,
	FaSolidCoins,
	FaSolidListOl,
	FaSolidT,
	FaSolidUser,
} from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import AiUsageSessionTableRow from "@/components/AiUsageSessionTableRow/AiUsageSessionTableRow";
import EmptyState from "@/components/EmptyState/EmptyState";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import Table from "@/components/Table/Table";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

export const AiUsageSessionList: Component<{
	state: {
		searchParams: QueryStateResponse;
	};
	onOpen: (session: AiUsageSession) => void;
}> = (props) => {
	// ----------------------------------
	// Queries
	const sessions = api.ai.useGetUsageSessions({
		queryParams: {
			queryString: props.state.searchParams.queryString,
		},
		enabled: () => props.state.searchParams.ready(),
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				error={sessions.isError}
				empty={sessions.data?.data.length === 0}
				queryState={props.state.searchParams}
				emptyFallback={
					<EmptyState
						title={T()("empty.states.ai.usage.title")}
						description={T()("empty.states.ai.usage.description")}
					/>
				}
				class={classnames(
					"border-t border-border",
					sessions.isError || sessions.data?.data.length === 0
						? "-mb-4"
						: undefined,
				)}
			>
				<Table.Root
					id="ai-usage.sessions"
					rowCount={sessions.data?.data.length || 0}
					queryState={props.state.searchParams}
					columns={[
						{
							label: T()("ai.usage.session"),
							key: "session",
							icon: <FaSolidT />,
							minWidth: 240,
						},
						{
							label: T()("common.user"),
							key: "user",
							icon: <FaSolidUser />,
						},
						{
							label: T()("ai.usage.credits"),
							key: "credits",
							icon: <FaSolidCoins />,
							sortable: true,
						},
						{
							label: T()("ai.usage.usage"),
							key: "usage",
							icon: <FaSolidChartSimple />,
							minWidth: 220,
						},
						{
							label: T()("ai.usage.requests"),
							key: "requests",
							icon: <FaSolidListOl />,
						},
						{
							label: T()("ai.usage.last.activity"),
							key: "lastActivityAt",
							icon: <FaSolidCalendar />,
							sortable: true,
							minWidth: 170,
						},
					]}
					loading={sessions.isFetching}
					padding="sm"
					variant="contained"
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
				variant="inline"
				padding="sm"
				hideWhenEmpty
			/>
		</>
	);
};
