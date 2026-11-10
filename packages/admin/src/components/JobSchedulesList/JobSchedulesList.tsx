import { useQueryClient } from "@tanstack/solid-query";
import {
	TbOutlineCalendar,
	TbOutlineCircleCheck,
	TbOutlineLetterT,
} from "solid-icons/tb";
import { type Component, createMemo, Index, Show } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import JobScheduleTableRow from "@/components/JobScheduleTableRow/JobScheduleTableRow";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import ScheduleDetailsDrawer from "@/components/ScheduleDetailsDrawer/ScheduleDetailsDrawer";
import SetScheduleStateModal from "@/components/SetScheduleStateModal/SetScheduleStateModal";
import StateNote from "@/components/StateNote/StateNote";
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
	const showingState = createMemo(
		() => schedules.isLoadingError || schedules.data?.data.length === 0,
	);
	const showToolbar = createMemo(
		() => !showingState() || !searchParams.filtersAreDefault(),
	);
	const selectedSchedule = createMemo(() =>
		schedules.data?.data.find(
			(schedule) => schedule.key === rowTarget.getTargetId(),
		),
	);

	// ----------------------------------
	// Render
	return (
		<>
			{/* the query toolbar sits above the card, which holds only the table and pagination */}
			<div class="flex flex-col gap-3">
				{/* nothing to filter until there are rows or filters are set */}
				<Show when={showToolbar()}>
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
						padding="none"
					/>
				</Show>
				<InfoRow.Content padding="none">
					<QueryBoundary
						appearance="inline"
						error={schedules.isLoadingError}
						onRetry={() => schedules.refetch()}
						empty={schedules.data?.data.length === 0}
						queryState={searchParams}
						emptyFallback={
							<StateNote>{T()("empty.states.job.schedules")}</StateNote>
						}
						class={showingState() ? "p-4" : undefined}
					>
						<Table.Root
							id="jobs.schedules.list"
							rowCount={schedules.data?.data.length ?? 0}
							queryState={searchParams}
							columns={[
								{
									label: T()("common.status"),
									key: "state",
									icon: <TbOutlineCircleCheck />,
								},
								{
									label: T()("common.schedule"),
									key: "name",
									icon: <TbOutlineLetterT />,
									minWidth: 260,
									sortable: true,
								},
								{
									label: T()("common.job"),
									key: "jobName",
									icon: <TbOutlineLetterT />,
									minWidth: 260,
									sortable: true,
								},
								{
									label: T()("jobs.schedules.next.run"),
									key: "nextRunAt",
									icon: <TbOutlineCalendar />,
									sortable: true,
								},
								{
									label: T()("jobs.schedules.last.result"),
									key: "lastResult",
									icon: <TbOutlineCircleCheck />,
								},
							]}
							loading={schedules.isLoading}
							stale={schedules.isPlaceholderData}
							padding="sm"
							variant="contained"
							class="border-y-0"
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
						loading={schedules.isLoading}
						variant="footer"
						padding="sm"
						hideWhenEmpty
					/>
				</InfoRow.Content>
			</div>

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
