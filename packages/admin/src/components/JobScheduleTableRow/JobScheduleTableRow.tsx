import type { JobScheduleSummary } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";
import JobScheduleDetailsCell from "./parts/JobScheduleDetailsCell";

interface JobScheduleRowProps {
	index: number;
	schedule: JobScheduleSummary;
	rowTarget: ReturnType<
		typeof useRowTarget<"details" | "runs" | "state", string>
	>;
	triggerPending: boolean;
	onTrigger: () => void;
}

const JobScheduleTableRow: Component<JobScheduleRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const lastStatus = () => props.schedule.lastRun?.status;

	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={[
				{
					label: T()("common.details"),
					type: "button",
					icon: "info",
					onClick: () => {
						props.rowTarget.setTargetId(props.schedule.key);
						props.rowTarget.setTrigger("details", true);
					},
					permission: Permissions.JobsRead,
					sortOrder: 0,
				},
				{
					label: T()("jobs.schedules.runs"),
					type: "button",
					icon: "clock",
					onClick: () => {
						props.rowTarget.setTargetId(props.schedule.key);
						props.rowTarget.setTrigger("runs", true);
					},
					permission: Permissions.JobsRead,
					sortOrder: 10,
				},
				{
					label: T()("jobs.schedules.run.now"),
					type: "button",
					icon: "rotate",
					excludeFromRowClick: true,
					permission: Permissions.JobsRun,
					disabled: props.triggerPending,
					onClick: props.onTrigger,
					variant: "primary",
					sortOrder: 50,
				},
				{
					label:
						props.schedule.state === "paused"
							? T()("jobs.schedules.resume")
							: T()("jobs.schedules.pause"),
					type: "button",
					icon: props.schedule.state === "paused" ? "check" : "ban",
					excludeFromRowClick: true,
					permission: Permissions.JobsUpdate,
					variant: props.schedule.state === "paused" ? "primary" : "danger",
					onClick: () => {
						props.rowTarget.setTargetId(props.schedule.key);
						props.rowTarget.setTrigger("state", true);
					},
					sortOrder: 70,
				},
			]}
		>
			<Table.Pill
				column="state"
				text={
					props.schedule.state === "paused"
						? T()("common.status.paused")
						: T()("common.status.active")
				}
				variant={
					props.schedule.state === "paused"
						? "warning-subtle"
						: "success-subtle"
				}
			/>
			<JobScheduleDetailsCell column="name" schedule={props.schedule} />
			<Table.Text
				column="jobName"
				text={`${props.schedule.jobName} v${props.schedule.jobVersion}`}
				minWidth={260}
			/>
			<Table.Date
				column="nextRunAt"
				date={props.schedule.nextRunAt}
				includeTime
			/>
			<Table.Pill
				column="lastResult"
				text={lastStatus()}
				variant={lastStatus() === "failed" ? "danger-subtle" : "outline"}
			/>
		</Table.Row>
	);
};

export default JobScheduleTableRow;
