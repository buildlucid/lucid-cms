import { useQueryClient } from "@tanstack/solid-query";
import classnames from "classnames";
import { FaSolidCalendar, FaSolidCircleCheck, FaSolidT } from "solid-icons/fa";
import { type Component, createMemo, Index } from "solid-js";
import EmptyState from "@/components/EmptyState/EmptyState";
import JobScheduleTableRow from "@/components/JobScheduleTableRow/JobScheduleTableRow";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import ScheduleDetailsDrawer from "@/components/ScheduleDetailsDrawer/ScheduleDetailsDrawer";
import SetScheduleStateModal from "@/components/SetScheduleStateModal/SetScheduleStateModal";
import Table from "@/components/Table/Table";
import ViewScheduleRunsDrawer from "@/components/ViewScheduleRunsDrawer/ViewScheduleRunsDrawer";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
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
		singleSort: true,
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
			<QueryToolbar
				queryState={searchParams}
				onRefresh={() => {
					queryClient.invalidateQueries({
						queryKey: queryKeys.jobs.schedules(),
					});
				}}
				filterSubject={T()("routes.system.jobs.schedules.title")}
				filterFields={[
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
				]}
				sorts={[
					{ label: T()("common.schedule"), key: "name" },
					{ label: T()("jobs.name"), key: "jobName" },
					{ label: T()("jobs.schedules.next.run"), key: "nextRunAt" },
				]}
				perPage={[5, 10, 20]}
				padding="sm"
			/>
			<QueryBoundary
				error={schedules.isError}
				empty={schedules.data?.data.length === 0}
				emptyFallback={
					<EmptyState
						title={T()("empty.states.job.schedules.title")}
						description={T()("empty.states.job.schedules.description")}
					/>
				}
				class={classnames(
					"border-t border-border",
					schedules.isError || schedules.data?.data.length === 0
						? "-mb-4"
						: undefined,
				)}
			>
				<Table.Root
					id="jobs.schedules.list"
					rowCount={schedules.data?.data.length ?? 0}
					queryState={searchParams}
					columns={[
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
					loading={schedules.isFetching}
					padding="sm"
					variant="contained"
				>
					<Index each={schedules.data?.data ?? []}>
						{(schedule, index) => (
							<JobScheduleTableRow
								index={index}
								schedule={schedule()}
								rowTarget={rowTarget}
								triggerPending={trigger.action.isPending}
								onTrigger={() =>
									trigger.action.mutate({ scheduleKey: schedule().key })
								}
							/>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination
				queryState={searchParams}
				meta={schedules.data?.meta}
				variant="inline"
				padding="sm"
				hideWhenEmpty
			/>

			<ScheduleDetailsDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().details,
					setOpen: (open) => rowTarget.setTrigger("details", open),
				}}
			/>
			<ViewScheduleRunsDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().runs,
					setOpen: (open) => rowTarget.setTrigger("runs", open),
				}}
			/>
			<SetScheduleStateModal
				schedule={selectedSchedule}
				state={{
					open: rowTarget.getTriggers().state,
					setOpen: (open) => rowTarget.setTrigger("state", open),
				}}
			/>
		</>
	);
};
