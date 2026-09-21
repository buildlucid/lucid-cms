import {
	type Accessor,
	type Component,
	createMemo,
	For,
	lazy,
	Show,
	Suspense,
} from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import Drawer from "@/components/Drawer/Drawer";
import Pill from "@/components/Pill/Pill";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

const JSONPreview = lazy(() => import("@/components/JSONPreview/JSONPreview"));

interface JobDetailsPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const JobDetailsDrawer: Component<JobDetailsPanelProps> = (props) => {
	// ---------------------------------
	// Queries
	const job = api.jobs.useGetSingle({
		queryParams: {
			location: {
				jobId: props.id,
			},
		},
		enabled: () => !!props.id(),
	});

	// ---------------------------------
	// Memos
	const schedulesQuery = createMemo(() => {
		const jobName = job.data?.data.jobName;
		const jobVersion = job.data?.data.jobVersion;
		if (jobName === undefined || jobVersion === undefined) return "";

		return new URLSearchParams({
			"filter[jobName:=]": jobName,
			"filter[jobVersion:=]": jobVersion.toString(),
		}).toString();
	});

	// ---------------------------------
	// Queries
	const schedules = api.jobs.useGetSchedules({
		queryParams: {
			queryString: schedulesQuery,
			perPage: -1,
		},
		enabled: () => props.state.open && job.data?.data !== undefined,
	});

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={job.isLoading}
			error={job.isError ? T()("errors.generic.message") : undefined}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.jobs.details.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<SectionHeading title={T()("common.details")} />
				<DetailsList
					type="text"
					items={[
						{
							label: T()("jobs.id"),
							value: job.data?.data.jobId ?? undefined,
						},
						{
							label: T()("jobs.name"),
							value: job.data?.data.jobName ?? undefined,
						},
						{
							label: T()("jobs.version"),
							value: job.data?.data.jobVersion ?? undefined,
						},
						{
							label: T()("jobs.trigger.type"),
							value: job.data?.data.triggerType ?? undefined,
						},
						{
							label: T()("jobs.schedule.key"),
							value: job.data?.data.scheduleKey ?? undefined,
						},
						{
							label: T()("common.scheduled.for"),
							value: dateHelpers.formatDate(job.data?.data.scheduledFor),
						},
						{
							label: T()("common.status"),
							value: job.data?.data.status ?? undefined,
						},
						{
							label: T()("queue.adapter"),
							value: job.data?.data.queueAdapterKey ?? undefined,
						},
						{
							label: T()("jobs.dispatch.status"),
							value: job.data?.data.dispatchStatus ?? undefined,
						},
						{
							label: T()("common.attempts"),
							value: job.data?.data.attempts ?? 0,
						},
						{
							label: T()("common.max.attempts"),
							value: job.data?.data.maxAttempts ?? 0,
						},
						{
							label: T()("common.created.at"),
							value: dateHelpers.formatDate(job.data?.data.createdAt),
						},
						{
							label: T()("common.available.at"),
							value: dateHelpers.formatDate(job.data?.data.availableAt),
						},
						{
							label: T()("common.started.at"),
							value: dateHelpers.formatDate(job.data?.data.startedAt),
						},
						{
							label: T()("common.completed.at"),
							value: dateHelpers.formatDate(job.data?.data.completedAt),
						},
						{
							label: T()("common.failed.at"),
							value: dateHelpers.formatDate(job.data?.data.failedAt),
						},
						{
							label: T()("common.cancelled.at"),
							value: dateHelpers.formatDate(job.data?.data.cancelledAt),
						},
						{
							label: T()("jobs.dispatched.at"),
							value: dateHelpers.formatDate(job.data?.data.dispatchedAt),
						},
					]}
				/>
				<Show
					when={
						job.data?.data.status === "failed" && job.data?.data.errorMessage
					}
				>
					<div class="mb-4 p-4 bg-error-base/10 border border-error-base/20 rounded-md -mt-2.5">
						<h3 class="text-sm font-medium text-title mb-1">
							{T()("common.failed.with.message")}
						</h3>
						<p class="text-sm text-body">{job.data?.data.errorMessage}</p>
					</div>
				</Show>
				<Show when={job.data?.data.displayData}>
					<SectionHeading title={T()("jobs.details")} />
					<div class="mb-4">
						<Suspense
							fallback={
								<div class="h-40 bg-card-base border border-border rounded-md animate-pulse" />
							}
						>
							<JSONPreview json={job.data?.data.displayData || {}} />
						</Suspense>
					</div>
				</Show>
				<Show when={(schedules.data?.data.length ?? 0) > 0}>
					<SectionHeading title={T()("jobs.schedules.title")} />
					<div class="mb-4 flex flex-col gap-2">
						<For each={schedules.data?.data ?? []}>
							{(schedule) => (
								<div class="rounded-md border border-border bg-card-base p-3">
									<div class="flex items-center justify-between gap-3">
										<p class="truncate text-sm font-medium text-title">
											{schedule.name}
										</p>
										<div class="flex shrink-0 items-center justify-center">
											<Pill
												variant={
													schedule.state === "paused"
														? "warning-subtle"
														: "primary-subtle"
												}
											>
												{schedule.state === "paused"
													? T()("common.status.paused")
													: T()("common.status.active")}
											</Pill>
										</div>
									</div>
									<p class="mt-1 truncate text-xs text-unfocused">
										{schedule.cron} · {schedule.timezone}
									</p>
								</div>
							)}
						</For>
					</div>
				</Show>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

export default JobDetailsDrawer;
