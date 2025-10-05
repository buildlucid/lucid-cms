import T from "@/translations";
import { type Component, Index } from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import { FaSolidT, FaSolidCalendar, FaSolidListOl } from "solid-icons/fa";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Table } from "@/components/Groups/Table";
import JobRow from "@/components/Tables/Rows/JobRow";
import ViewJobPanel from "@/components/Panels/Job/ViewJobPanel";

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
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: {
					title: T()("no_jobs"),
					description: T()("no_jobs_description"),
				},
			}}
		>
			<Table
				key={"jobs.list"}
				rows={jobs.data?.data.length || 0}
				searchParams={props.state.searchParams}
				head={[
					{
						label: T()("status"),
						key: "status",
						icon: <FaSolidT />,
					},
					{
						label: T()("event_type"),
						key: "eventType",
						icon: <FaSolidT />,
					},
					{
						label: T()("queue_adapter"),
						key: "queueAdapterKey",
						icon: <FaSolidT />,
					},
					{
						label: T()("attempts"),
						key: "attempts",
						icon: <FaSolidListOl />,
					},
					{
						label: T()("max_attempts"),
						key: "maxAttempts",
						icon: <FaSolidListOl />,
					},
					{
						label: T()("priority"),
						key: "priority",
						icon: <FaSolidListOl />,
					},
					{
						label: T()("created_at"),
						key: "createdAt",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
					{
						label: T()("scheduled_for"),
						key: "scheduledFor",
						icon: <FaSolidCalendar />,
						sortable: true,
					},
					{
						label: T()("completed_at"),
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
				}}
			>
				{({ include, isSelectable, selected, setSelected }) => (
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
								}}
								callbacks={{
									setSelected: setSelected,
								}}
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
