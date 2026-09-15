import { useQueryClient } from "@tanstack/solid-query";
import { FaSolidCalendar, FaSolidListOl, FaSolidT } from "solid-icons/fa";
import { type Component, Index } from "solid-js";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import JobDetailsPanel from "@/components/JobDetailsPanel/JobDetailsPanel";
import JobTableRow from "@/components/JobTableRow/JobTableRow";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import { QueryRow } from "@/components/QueryRow/QueryRow";
import { Table } from "@/components/Table/Table";
import useQueryState, {
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import T from "@/translations";

export const JobsList: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				jobId: textFilter(),
				jobName: textFilter(),
				jobVersion: numberFilter(),
				triggerType: textFilter(),
				scheduleKey: textFilter(),
				status: textFilter(),
				queueAdapterKey: textFilter(),
				attempts: numberFilter(),
				maxAttempts: numberFilter(),
				dispatchStatus: textFilter(),
				dispatchAttempts: numberFilter(),
				dispatchError: textFilter(),
				errorMessage: textFilter(),
				createdByUserId: numberFilter(),
				createdAt: textFilter(),
				availableAt: textFilter(),
				startedAt: textFilter(),
				completedAt: textFilter(),
				failedAt: textFilter(),
				cancelledAt: textFilter(),
				dispatchedAt: textFilter(),
				leaseExpiresAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				availableAt: sort(),
				startedAt: sort(),
				completedAt: sort(),
				failedAt: sort(),
				cancelledAt: sort(),
				dispatchedAt: sort(),
				dispatchAttempts: sort(),
				attempts: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});
	const rowTarget = useRowTarget({
		triggers: {
			details: false,
		},
	});

	// ----------------------------------
	// Queries
	const jobs = api.jobs.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
		},
		enabled: () => searchParams.ready(),
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryRow
				searchParams={searchParams}
				onRefresh={() => {
					queryClient.invalidateQueries({
						queryKey: ["jobs.getMultiple"],
					});
					queryClient.invalidateQueries({
						queryKey: ["jobs.getSchedules"],
					});
				}}
				filterSection={{
					subject: T()("routes.system.jobs.title"),
					fields: [
						{ label: T()("jobs.id"), key: "jobId", type: "text" },
						{ label: T()("jobs.name"), key: "jobName", type: "text" },
						{
							label: T()("jobs.version"),
							key: "jobVersion",
							type: "number",
						},
						{
							label: T()("jobs.trigger.type"),
							key: "triggerType",
							type: "select",
							options: [
								{ label: T()("jobs.trigger.enqueue"), value: "enqueue" },
								{ label: T()("common.schedule"), value: "schedule" },
							],
						},
						{
							label: T()("jobs.schedule.key"),
							key: "scheduleKey",
							type: "text",
						},
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: [
								{ label: T()("common.status.queued"), value: "queued" },
								{ label: T()("common.status.running"), value: "running" },
								{
									label: T()("common.status.completed"),
									value: "completed",
								},
								{ label: T()("common.status.failed"), value: "failed" },
								{
									label: T()("common.status.cancelled"),
									value: "cancelled",
								},
							],
						},
						{
							label: T()("queue.adapter"),
							key: "queueAdapterKey",
							type: "text",
						},
						{
							label: T()("jobs.dispatch.status"),
							key: "dispatchStatus",
							type: "select",
							options: [
								{ label: T()("common.status.pending"), value: "pending" },
								{
									label: T()("common.status.dispatched"),
									value: "dispatched",
								},
							],
						},
						{
							label: T()("common.attempts"),
							key: "attempts",
							type: "number",
						},
						{
							label: T()("common.max.attempts"),
							key: "maxAttempts",
							type: "number",
						},
						{
							label: T()("common.error.message"),
							key: "errorMessage",
							type: "text",
						},
						{
							label: T()("common.created.by"),
							key: "createdByUserId",
							type: "user",
						},
						{
							label: T()("common.created.at"),
							key: "createdAt",
							type: "datetime",
						},
						{
							label: T()("common.available.at"),
							key: "availableAt",
							type: "datetime",
						},
						{
							label: T()("common.started.at"),
							key: "startedAt",
							type: "datetime",
						},
						{
							label: T()("common.completed.at"),
							key: "completedAt",
							type: "datetime",
						},
						{
							label: T()("common.failed.at"),
							key: "failedAt",
							type: "datetime",
						},
						{
							label: T()("common.cancelled.at"),
							key: "cancelledAt",
							type: "datetime",
						},
					],
				}}
				sorts={[
					{ label: T()("common.created.at"), key: "createdAt" },
					{ label: T()("common.available.at"), key: "availableAt" },
					{ label: T()("common.started.at"), key: "startedAt" },
					{ label: T()("common.completed.at"), key: "completedAt" },
					{ label: T()("common.failed.at"), key: "failedAt" },
					{ label: T()("common.attempts"), key: "attempts" },
				]}
				perPage={[]}
				options={{ padding: "16" }}
			/>
			<DynamicContent
				class={
					jobs.isError || jobs.data?.data.length === 0 ? "-mb-4" : undefined
				}
				state={{
					isError: jobs.isError,
					isSuccess: jobs.isSuccess,
					isEmpty: jobs.data?.data.length === 0,
					searchParams,
				}}
				slot={{
					footer: (
						<PaginatedFooter
							state={{
								searchParams,
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
					dividerTop: true,
				}}
			>
				<Table
					key={"jobs.list"}
					rows={jobs.data?.data.length || 0}
					searchParams={searchParams}
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
							label: T()("jobs.trigger.type"),
							key: "trigger",
							icon: <FaSolidT />,
						},
						{
							label: T()("common.attempts"),
							key: "attempts",
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
							label: T()("common.finished.at"),
							key: "finishedAt",
							icon: <FaSolidCalendar />,
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
								<JobTableRow
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
				<JobDetailsPanel
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().details,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("details", state);
						},
					}}
				/>
			</DynamicContent>
		</>
	);
};
