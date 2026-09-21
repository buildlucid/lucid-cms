import { type Accessor, type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import Drawer from "@/components/Drawer/Drawer";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import formatDuration from "@/utils/format-duration";

interface ScheduleDetailsPanelProps {
	id: Accessor<string | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ScheduleDetailsDrawer: Component<ScheduleDetailsPanelProps> = (props) => {
	// ----------------------------------
	// Queries
	const schedules = api.jobs.useGetSchedules({
		queryParams: {
			filters: { key: props.id },
			perPage: 1,
		},
		enabled: () => props.state.open && props.id() !== undefined,
	});

	// ----------------------------------
	// Memos
	const schedule = () => schedules.data?.data[0];

	// ----------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={schedules.isLoading}
			error={schedules.isError ? T()("errors.generic.message") : undefined}
		>
			<Drawer.Header>
				<Drawer.Title>
					{T()("panels.jobs.schedules.details.title")}
				</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<SectionHeading title={T()("common.details")} />
				<DetailsList
					type="text"
					items={[
						{ label: T()("common.status"), value: schedule()?.state },
						{ label: T()("common.key"), value: schedule()?.key },
						{ label: T()("common.schedule"), value: schedule()?.name },
						{ label: T()("jobs.name"), value: schedule()?.jobName },
						{ label: T()("jobs.version"), value: schedule()?.jobVersion },
						{
							label: T()("jobs.schedules.expression"),
							value: schedule()?.cron,
						},
						{ label: T()("common.timezone"), value: schedule()?.timezone },
						{
							label: T()("jobs.schedules.overlap"),
							value: schedule()?.overlap,
						},
						{
							label: T()("jobs.schedules.missed"),
							value: schedule()?.missed,
						},
						{
							label: T()("jobs.schedules.next.run"),
							value: dateHelpers.formatDate(schedule()?.nextRunAt),
						},
						{
							label: T()("jobs.schedules.paused.at"),
							value: dateHelpers.formatDate(schedule()?.pausedAt),
						},
					]}
				/>
				<Show when={schedule()?.lastRun}>
					<SectionHeading title={T()("jobs.schedules.last.run")} />
					<DetailsList
						type="text"
						items={[
							{
								label: T()("common.scheduled.for"),
								value: dateHelpers.formatDate(
									schedule()?.lastRun?.scheduledFor,
								),
							},
							{
								label: T()("common.status"),
								value: schedule()?.lastRun?.status,
							},
							{
								label: T()("common.attempts"),
								value: `${schedule()?.lastRun?.attempts}/${schedule()?.lastRun?.maxAttempts}`,
							},
							{
								label: T()("common.duration"),
								value: formatDuration(schedule()?.lastRun?.durationMs),
							},
						]}
					/>
					<Show when={schedule()?.lastRun?.errorMessage}>
						<div class="mb-4 rounded-md border border-error-base/20 bg-error-base/10 p-4 text-sm text-body">
							{schedule()?.lastRun?.errorMessage}
						</div>
					</Show>
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

export default ScheduleDetailsDrawer;
