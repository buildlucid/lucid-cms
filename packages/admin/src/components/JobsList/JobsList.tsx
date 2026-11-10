import { useQueryClient } from "@tanstack/solid-query";
import {
	TbOutlineCalendar,
	TbOutlineLetterT,
	TbOutlineListNumbers,
} from "solid-icons/tb";
import { type Component, createMemo, Index, Show } from "solid-js";
import InfoRow from "@/components/InfoRow/InfoRow";
import JobDetailsDrawer from "@/components/JobDetailsDrawer/JobDetailsDrawer";
import JobTableRow from "@/components/JobTableRow/JobTableRow";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import StateNote from "@/components/StateNote/StateNote";
import Table from "@/components/Table/Table";
import useQueryState, {
	numberFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
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
				jobKey: textFilter(),
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
		singleSort: true,
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
	// Memos
	const showingState = createMemo(
		() => jobs.isLoadingError || jobs.data?.data.length === 0,
	);
	const showToolbar = createMemo(
		() => !showingState() || !searchParams.filtersAreDefault(),
	);

	// ----------------------------------------
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
								queryKey: queryKeys.jobs.list(),
							});
							queryClient.invalidateQueries({
								queryKey: queryKeys.jobs.schedules(),
							});
						}}
						filterSubject={T()("routes.system.jobs.title")}
						filterFields={[
							{ label: T()("jobs.id"), key: "jobId", type: "text" },
							{ label: T()("jobs.key"), key: "jobKey", type: "text" },
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
						]}
						sorts={[
							{ label: T()("common.created.at"), key: "createdAt" },
							{ label: T()("common.available.at"), key: "availableAt" },
							{ label: T()("common.started.at"), key: "startedAt" },
							{ label: T()("common.completed.at"), key: "completedAt" },
							{ label: T()("common.failed.at"), key: "failedAt" },
							{ label: T()("common.attempts"), key: "attempts" },
						]}
						perPage
						padding="none"
					/>
				</Show>
				<InfoRow.Content padding="none">
					<QueryBoundary
						appearance="inline"
						error={jobs.isLoadingError}
						onRetry={() => jobs.refetch()}
						empty={jobs.data?.data.length === 0}
						queryState={searchParams}
						emptyFallback={
							<StateNote>{T()("empty.states.jobs.note")}</StateNote>
						}
						class={showingState() ? "p-4" : undefined}
					>
						<Table.Root
							id="jobs.list"
							rowCount={jobs.data?.data.length || 0}
							queryState={searchParams}
							columns={[
								{
									label: T()("common.status"),
									key: "status",
									icon: <TbOutlineLetterT />,
								},
								{
									label: T()("common.job"),
									key: "job",
									icon: <TbOutlineLetterT />,
									minWidth: 260,
								},
								{
									label: T()("jobs.trigger.type"),
									key: "trigger",
									icon: <TbOutlineLetterT />,
								},
								{
									label: T()("common.attempts"),
									key: "attempts",
									icon: <TbOutlineListNumbers />,
									sortable: true,
								},
								{
									label: T()("common.created.at"),
									key: "createdAt",
									icon: <TbOutlineCalendar />,
									sortable: true,
								},
								{
									label: T()("common.finished.at"),
									key: "finishedAt",
									icon: <TbOutlineCalendar />,
								},
							]}
							loading={jobs.isLoading}
							stale={jobs.isPlaceholderData}
							padding="sm"
							variant="contained"
							class="border-y-0"
						>
							<Index each={jobs.data?.data || []}>
								{(job, i) => (
									<JobTableRow index={i} job={job()} rowTarget={rowTarget} />
								)}
							</Index>
						</Table.Root>
						<JobDetailsDrawer
							id={rowTarget.getTargetId}
							state={{
								open: rowTarget.getTriggers().details,
								setOpen: (state: boolean) => {
									rowTarget.setTrigger("details", state);
								},
							}}
						/>
					</QueryBoundary>
					<Pagination
						queryState={searchParams}
						pagination={jobs.data?.pagination}
						loading={jobs.isLoading}
						variant="footer"
						padding="sm"
						hideWhenEmpty
					/>
				</InfoRow.Content>
			</div>
		</>
	);
};
