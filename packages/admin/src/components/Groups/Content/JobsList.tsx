import { FaSolidCalendar, FaSolidListOl, FaSolidT } from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table/Table";
import ViewJobPanel from "@/components/Panels/Job/ViewJobPanel";
import JobRow from "@/components/Tables/Rows/JobRow";
import useRowTarget from "@/hooks/useRowTarget";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import T from "@/translations";

export const JobsList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			preview: false,
		},
	});

	// ----------------------------------
	// Queries
	const jobs = api.jobs.useGetMultiple({
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
				isError: jobs.isError,
				isSuccess: jobs.isSuccess,
				isEmpty: jobs.data?.data.length === 0,
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: jobs.data?.meta,
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
					title: T()("empty.states.jobs.title"),
					description: T()("empty.states.jobs.description"),
				},
			}}
			options={{
				inline: true,
			}}
		>
			<Table
				key={"jobs.list"}
				rows={jobs.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("common.status"),
						key: "status",
						icon: <FaSolidT />,
					},
					{
						label: T()("common.job"),
						key: "job",
						icon: <FaSolidT />,
						minWidth: 260,
					},
					{
						label: T()("common.attempts"),
						key: "attempts",
						icon: <FaSolidListOl />,
						sortable: true,
					},
					{
						label: T()("common.max.attempts"),
						key: "maxAttempts",
						icon: <FaSolidListOl />,
					},
					{
						label: T()("common.priority"),
						key: "priority",
						icon: <FaSolidListOl />,
						sortable: true,
					},
					{
						label: T()("common.created.at"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
					{
						label: T()("common.scheduled.for"),
						key: "scheduledFor",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
					{
						label: T()("common.completed.at"),
						key: "completedAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
				]}
				state={{
					isLoading: jobs.isFetching,
					isSuccess: jobs.isSuccess,
				}}
				options={{
					isSelectable: false,
					padding: "16",
				}}
				theme="contained"
			>
				{({ include, isSelectable, selected, setSelected, theme }) => (
					<Index each={jobs.data?.data || []}>
						{(job, i) => (
							<JobRow
								index={i}
								job={job()}
								include={include}
								selected={selected[i]}
								rowTarget={rowTarget}
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
			<ViewJobPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().preview,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("preview", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
