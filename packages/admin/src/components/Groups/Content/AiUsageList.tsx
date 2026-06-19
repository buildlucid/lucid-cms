import {
	FaSolidCalendar,
	FaSolidChartSimple,
	FaSolidListOl,
	FaSolidT,
	FaSolidUser,
} from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table/Table";
import AiUsageRow from "@/components/Tables/Rows/AiUsageRow";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import T from "@/translations";

export const AiUsageList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	// ----------------------------------
	// Queries
	const aiUsage = api.ai.useGetUsage({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: aiUsage.isError,
				isSuccess: aiUsage.isSuccess,
				isEmpty: aiUsage.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: aiUsage.data?.meta,
						}}
						options={{
							embedded: true,
							padding: "16",
							hideEmptyMessage: true,
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("empty.states.ai.usage.title"),
					description: T()("empty.states.ai.usage.description"),
				},
			}}
			options={{
				inline: true,
			}}
		>
			<Table
				key={"ai-usage.list.v3"}
				rows={aiUsage.data?.data.length || 0}
				searchParams={props.state.searchParams}
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
				state={{
					isLoading: aiUsage.isFetching,
					isSuccess: aiUsage.isSuccess,
				}}
				options={{
					isSelectable: false,
					padding: "16",
				}}
				theme="contained"
			>
				{({ include, isSelectable, selected, setSelected, theme }) => (
					<Index each={aiUsage.data?.data || []}>
						{(usage, i) => (
							<AiUsageRow
								index={i}
								aiUsage={usage()}
								include={include}
								selected={selected[i]}
								options={{
									isSelectable,
									padding: "16",
								}}
								callbacks={{
									setSelected: setSelected,
								}}
								theme={theme}
							/>
						)}
					</Index>
				)}
			</Table>
		</DynamicContent>
	);
};
