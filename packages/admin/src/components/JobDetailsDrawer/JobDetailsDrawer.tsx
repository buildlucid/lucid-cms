import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	lazy,
	on,
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
import formatDuration from "@/utils/format-duration";
import { jobStatusPills } from "@/utils/jobs";
import JobErrorCard from "./parts/JobErrorCard";

const JSONPreview = lazy(() => import("@/components/JSONPreview/JSONPreview"));

type JobDetailsTab = "details" | "input" | "schedule";

interface JobDetailsPanelProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const JobDetailsDrawer: Component<JobDetailsPanelProps> = (props) => {
	// ---------------------------------
	// State
	const [activeTab, setActiveTab] = createSignal<JobDetailsTab>("details");

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
	const schedules = api.jobs.useGetSchedules({
		queryParams: {
			filters: { key: () => job.data?.data.scheduleKey ?? undefined },
			perPage: 1,
		},
		enabled: () => props.state.open && !!job.data?.data.scheduleKey,
	});

	// ---------------------------------
	// Memos
	const data = () => job.data?.data;
	const schedule = () => schedules.data?.data[0];
	const finishedAt = createMemo(
		() => data()?.completedAt ?? data()?.failedAt ?? data()?.cancelledAt,
	);
	const duration = createMemo(() => {
		const startedAt = data()?.startedAt;
		const endedAt = finishedAt();
		if (!startedAt || !endedAt) return undefined;
		return formatDuration(
			new Date(endedAt).getTime() - new Date(startedAt).getTime(),
		);
	});
	const tabs = createMemo(() => [
		{ value: "details" as const, label: T()("common.details") },
		{
			value: "input" as const,
			label: T()("jobs.input"),
			show: !!data()?.displayData,
		},
		{
			value: "schedule" as const,
			label: T()("common.schedule"),
			show: !!data()?.scheduleKey,
		},
	]);
	const showTabs = createMemo(
		() => tabs().filter((tab) => tab.show !== false).length > 1,
	);

	// ---------------------------------
	// Effects
	createEffect(on(props.id, () => setActiveTab("details")));

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={job.isLoading}
			error={job.isError ? T()("errors.generic.message") : undefined}
		>
			<Drawer.Header border={!showTabs()}>
				<Drawer.Title class="flex min-w-0 items-center gap-2">
					<span class="truncate">
						{data()?.jobName ?? T()("panels.jobs.details.title")}
					</span>
					<Show when={data()?.status}>
						{(status) => (
							<Pill
								variant={jobStatusPills[status()]}
								size="xs"
								class="shrink-0"
							>
								{T()(`common.status.${status()}`)}
							</Pill>
						)}
					</Show>
				</Drawer.Title>
				<Show when={data()}>
					{(job) => (
						<Drawer.Description class="break-all">
							v{job().jobVersion} · {job().jobId}
						</Drawer.Description>
					)}
				</Show>
			</Drawer.Header>
			<Drawer.Body class="flex flex-col gap-3">
				<Show when={showTabs()}>
					<Drawer.Tabs
						items={tabs()}
						value={activeTab()}
						onChange={setActiveTab}
					/>
				</Show>
				<Show when={activeTab() === "details"}>
					<div>
						<Show when={data()?.errorMessage}>
							{(message) => (
								<JobErrorCard
									title={
										data()?.status === "failed"
											? T()("jobs.final.attempt.failed")
											: T()("jobs.last.attempt.failed")
									}
									message={message()}
									stack={data()?.errorStack ?? null}
								/>
							)}
						</Show>
						<SectionHeading title={T()("jobs.run")} level={3} />
						<DetailsList
							class="mb-3 last:mb-0"
							items={[
								{
									label: T()("jobs.trigger.type"),
									value:
										data()?.triggerType === "schedule"
											? T()("common.schedule")
											: T()("jobs.trigger.enqueue"),
								},
								{
									label: T()("common.scheduled.for"),
									value: dateHelpers.formatDate(data()?.scheduledFor),
									show: !!data()?.scheduledFor,
								},
								{
									label: T()("common.attempts"),
									value: `${data()?.attempts ?? 0}/${data()?.maxAttempts ?? 0}`,
								},
								{
									label: T()("common.duration"),
									value: duration(),
									show: duration() !== undefined,
								},
							]}
						/>
						<SectionHeading title={T()("jobs.timeline")} level={3} />
						<DetailsList
							class="mb-3 last:mb-0"
							items={[
								{
									label: T()("common.created.at"),
									value: dateHelpers.formatDate(data()?.createdAt),
								},
								{
									label: T()("common.available.at"),
									value: dateHelpers.formatDate(data()?.availableAt),
								},
								{
									label: T()("common.started.at"),
									value: dateHelpers.formatDate(data()?.startedAt),
									show: !!data()?.startedAt,
								},
								{
									label: T()("common.completed.at"),
									value: dateHelpers.formatDate(data()?.completedAt),
									show: !!data()?.completedAt,
								},
								{
									label: T()("common.failed.at"),
									value: dateHelpers.formatDate(data()?.failedAt),
									show: !!data()?.failedAt,
								},
								{
									label: T()("common.cancelled.at"),
									value: dateHelpers.formatDate(data()?.cancelledAt),
									show: !!data()?.cancelledAt,
								},
							]}
						/>
						<SectionHeading title={T()("common.queue")} level={3} />
						<DetailsList
							class="mb-3 last:mb-0"
							items={[
								{
									label: T()("queue.adapter"),
									value: data()?.queueAdapterKey,
								},
								{
									label: T()("jobs.dispatch.status"),
									value: data()?.dispatchStatus,
								},
								{
									label: T()("jobs.dispatch.attempts"),
									value: data()?.dispatchAttempts ?? 0,
									show: (data()?.dispatchAttempts ?? 0) > 0,
								},
								{
									label: T()("jobs.dispatched.at"),
									value: dateHelpers.formatDate(data()?.dispatchedAt),
									show: !!data()?.dispatchedAt,
								},
								{
									label: T()("jobs.dispatch.error"),
									value: data()?.dispatchError,
									show: !!data()?.dispatchError,
									stacked: true,
									wrap: true,
								},
							]}
						/>
					</div>
				</Show>
				<Show when={activeTab() === "input"}>
					<Suspense
						fallback={
							<div class="h-40 bg-card border border-border rounded-md animate-pulse" />
						}
					>
						<JSONPreview json={data()?.displayData || {}} />
					</Suspense>
				</Show>
				<Show when={activeTab() === "schedule"}>
					<DetailsList
						class="mb-6 last:mb-0"
						items={[
							{
								label: T()("common.schedule"),
								value: schedule()?.name ?? data()?.scheduleKey,
							},
							{
								label: T()("common.status"),
								type: "pill",
								value:
									schedule()?.state === "paused"
										? T()("common.status.paused")
										: T()("common.status.active"),
								pillVariant:
									schedule()?.state === "paused"
										? "warning-subtle"
										: "success-subtle",
								show: schedule() !== undefined,
							},
							{
								label: T()("jobs.schedules.expression"),
								value: schedule()?.cron,
								show: schedule() !== undefined,
							},
							{
								label: T()("common.timezone"),
								value: schedule()?.timezone,
								show: schedule() !== undefined,
							},
							{
								label: T()("jobs.schedules.next.run"),
								value: dateHelpers.formatDate(schedule()?.nextRunAt),
								show: schedule() !== undefined,
							},
						]}
					/>
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
