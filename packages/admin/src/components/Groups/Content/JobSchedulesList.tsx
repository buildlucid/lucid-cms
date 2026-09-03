import { useQueryClient } from "@tanstack/solid-query";
import { FaSolidCalendar, FaSolidCircleCheck, FaSolidT } from "solid-icons/fa";
import { type Component, createMemo, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import { Table } from "@/components/Groups/Table/Table";
import SetScheduleState from "@/components/Modals/Job/SetScheduleState";
import ScheduleDetailsPanel from "@/components/Panels/Job/ScheduleDetailsPanel";
import ViewScheduleRunsPanel from "@/components/Panels/Job/ViewScheduleRunsPanel";
import JobScheduleRow from "@/components/Tables/Rows/JobScheduleRow";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import T from "@/translations";

export const JobSchedulesList: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				name: textFilter(),
				jobName: textFilter(),
				state: textFilter(),
			},
			sorts: {
				name: sort({ defaultValue: "asc" }),
				jobName: sort(),
				nextRunAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		options: { singleSort: true },
	});
	const rowTarget = useRowTarget<"details" | "runs" | "state", string>({
		triggers: { details: false, runs: false, state: false },
	});

	// ----------------------------------
	// Queries & Mutations
	const schedules = api.jobs.useGetSchedules({
		queryParams: { queryString: searchParams.queryString },
		enabled: () => searchParams.ready(),
	});
	const trigger = api.jobs.useTriggerSchedule();

	// ----------------------------------
	// Memos
	const selectedSchedule = createMemo(() =>
		schedules.data?.data.find(
			(schedule) => schedule.key === rowTarget.getTargetId(),
		),
	);

	// ----------------------------------
	// Render
	return (
		<>
			<QueryRow
				searchParams={searchParams}
				onRefresh={() => {
					queryClient.invalidateQueries({ queryKey: ["jobs.getSchedules"] });
				}}
				filterSection={{
					subject: T()("routes.system.jobs.schedules.title"),
					fields: [
						{ label: T()("common.schedule"), key: "name", type: "text" },
						{ label: T()("jobs.name"), key: "jobName", type: "text" },
						{
							label: T()("common.status"),
							key: "state",
							type: "select",
							options: [
								{ label: T()("common.status.active"), value: "active" },
								{ label: T()("common.status.paused"), value: "paused" },
							],
						},
					],
				}}
				sorts={[
					{ label: T()("common.schedule"), key: "name" },
					{ label: T()("jobs.name"), key: "jobName" },
					{ label: T()("jobs.schedules.next.run"), key: "nextRunAt" },
				]}
				perPage={[5, 10, 20]}
				options={{ padding: "16" }}
			/>
			<DynamicContent
				class={
					schedules.isError || schedules.data?.data.length === 0
						? "-mb-4"
						: undefined
				}
				state={{
					isError: schedules.isError,
					isSuccess: schedules.isSuccess,
					isEmpty: schedules.data?.data.length === 0,
					searchParams,
				}}
				slot={{
					footer: (
						<Paginated
							state={{ searchParams, meta: schedules.data?.meta }}
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
						title: T()("empty.states.job.schedules.title"),
						description: T()("empty.states.job.schedules.description"),
					},
				}}
				options={{ inline: true, dividerTop: true }}
			>
				<Table
					key="jobs.schedules.list"
					rows={schedules.data?.data.length ?? 0}
					searchParams={searchParams}
					head={[
						{
							label: T()("common.status"),
							key: "state",
							icon: <FaSolidCircleCheck />,
						},
						{
							label: T()("common.schedule"),
							key: "name",
							icon: <FaSolidT />,
							minWidth: 260,
							sortable: true,
						},
						{
							label: T()("common.job"),
							key: "jobName",
							icon: <FaSolidT />,
							minWidth: 260,
							sortable: true,
						},
						{
							label: T()("jobs.schedules.next.run"),
							key: "nextRunAt",
							icon: <FaSolidCalendar />,
							sortable: true,
						},
						{
							label: T()("jobs.schedules.last.result"),
							key: "lastResult",
							icon: <FaSolidCircleCheck />,
						},
					]}
					state={{
						isLoading: schedules.isFetching,
						isSuccess: schedules.isSuccess,
					}}
					options={{ isSelectable: false, padding: "16" }}
					theme="contained"
				>
					{({ include, isSelectable, selected, setSelected, theme }) => (
						<Index each={schedules.data?.data ?? []}>
							{(schedule, index) => (
								<JobScheduleRow
									index={index}
									schedule={schedule()}
									include={include}
									selected={selected[index]}
									rowTarget={rowTarget}
									options={{ isSelectable, padding: "16" }}
									callbacks={{ setSelected }}
									theme={theme}
									triggerPending={trigger.action.isPending}
									onTrigger={() =>
										trigger.action.mutate({ scheduleKey: schedule().key })
									}
								/>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>
			<ScheduleDetailsPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().details,
					setOpen: (open) => rowTarget.setTrigger("details", open),
				}}
			/>
			<ViewScheduleRunsPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().runs,
					setOpen: (open) => rowTarget.setTrigger("runs", open),
				}}
			/>
			<SetScheduleState
				schedule={selectedSchedule}
				state={{
					open: rowTarget.getTriggers().state,
					setOpen: (open) => rowTarget.setTrigger("state", open),
				}}
			/>
		</>
	);
};
