import classnames from "classnames";
import {
	FaSolidCalendar,
	FaSolidChartSimple,
	FaSolidListOl,
	FaSolidT,
	FaSolidUser,
} from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import AiUsageTableRow from "@/components/AiUsageTableRow/AiUsageTableRow";
import EmptyState from "@/components/EmptyState/EmptyState";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import Table from "@/components/Table/Table";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import T from "@/translations";

export const AiUsageList: Component<{
	state: {
		searchParams: QueryStateResponse;
	};
}> = (props) => {
	// ----------------------------------
	// Queries
	const aiUsage = api.ai.useGetUsage({
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
				isError={aiUsage.isError}
				isEmpty={aiUsage.data?.data.length === 0}
				queryState={props.state.searchParams}
				empty={
					<EmptyState
						title={T()("empty.states.ai.usage.title")}
						description={T()("empty.states.ai.usage.description")}
					/>
				}
				class={classnames(
					"border-t border-border",
					aiUsage.isError || aiUsage.data?.data.length === 0
						? "-mb-4"
						: undefined,
				)}
			>
				<Table.Root
					id="ai-usage.list"
					rowCount={aiUsage.data?.data.length || 0}
					queryState={props.state.searchParams}
					head={[
						{
							label: T()("common.status"),
							key: "status",
							icon: <FaSolidT />,
							width: 112,
							minWidth: 96,
						},
						{
							label: T()("ai.usage.feature"),
							key: "feature",
							icon: <FaSolidT />,
							minWidth: 220,
						},
						{
							label: T()("ai.usage.usage"),
							key: "usage",
							icon: <FaSolidChartSimple />,
							minWidth: 240,
						},
						{
							label: T()("ai.usage.cost"),
							key: "cost",
							icon: <FaSolidListOl />,
							sortable: true,
						},
						{
							label: T()("common.user"),
							key: "user",
							icon: <FaSolidUser />,
						},
						{
							label: T()("ai.usage.elapsed"),
							key: "durationMs",
							icon: <FaSolidListOl />,
							sortable: true,
							minWidth: 130,
						},
						{
							label: T()("ai.usage.initiated"),
							key: "createdAt",
							icon: <FaSolidCalendar />,
							sortable: true,
							minWidth: 170,
						},
					]}
					isLoading={aiUsage.isFetching}
					padding="sm"
					variant="contained"
				>
					<Index each={aiUsage.data?.data || []}>
						{(usage, i) => <AiUsageTableRow index={i} aiUsage={usage()} />}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={props.state.searchParams}
				meta={aiUsage.data?.meta}
				variant="inline"
				padding="sm"
				hideWhenEmpty
			/>
		</>
	);
};
