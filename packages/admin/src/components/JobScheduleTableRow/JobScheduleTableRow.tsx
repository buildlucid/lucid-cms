import type { JobScheduleSummary } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import TablePillCell from "@/components/TablePillCell/TablePillCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableTextCell from "@/components/TableTextCell/TableTextCell";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import JobScheduleDetailsCol from "./parts/JobScheduleDetailsCol";

interface JobScheduleRowProps extends TableRowProps {
	schedule: JobScheduleSummary;
	include: boolean[];
	theme?: TableTheme;
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
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
			actions={[
				{
					label: T()("common.details"),
					type: "button",
					icon: "info",
					onClick: () => {
						props.rowTarget.setTargetId(props.schedule.key);
						props.rowTarget.setTrigger("details", true);
					},
					permission: userStore.get.hasPermission([Permissions.JobsRead]).all,
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
					permission: userStore.get.hasPermission([Permissions.JobsRead]).all,
					sortOrder: 1,
				},
				{
					label: T()("jobs.schedules.run.now"),
					type: "button",
					icon: "rotate",
					theme: "primary",
					actionExclude: true,
					permission: userStore.get.hasPermission([Permissions.JobsRun]).all,
					disabled: props.triggerPending,
					onClick: props.onTrigger,
					sortOrder: 2,
				},
				{
					label:
						props.schedule.state === "paused"
							? T()("jobs.schedules.resume")
							: T()("jobs.schedules.pause"),
					type: "button",
					icon: props.schedule.state === "paused" ? "check" : "ban",
					actionExclude: true,
					permission: userStore.get.hasPermission([Permissions.JobsUpdate]).all,
					theme: props.schedule.state === "paused" ? "primary" : "error",
					onClick: () => {
						props.rowTarget.setTargetId(props.schedule.key);
						props.rowTarget.setTrigger("state", true);
					},
					sortOrder: 3,
				},
			]}
		>
			<TablePillCell
				text={
					props.schedule.state === "paused"
						? T()("common.status.paused")
						: T()("common.status.active")
				}
				variant={
					props.schedule.state === "paused"
						? "warning-subtle"
						: "primary-subtle"
				}
				options={{
					include: props.include[0],
					padding: props.options?.padding,
				}}
			/>
			<JobScheduleDetailsCol
				schedule={props.schedule}
				options={{
					include: props.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={`${props.schedule.jobName} v${props.schedule.jobVersion}`}
				options={{
					include: props.include[2],
					minWidth: 260,
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={props.schedule.nextRunAt}
				includeTime
				options={{
					include: props.include[3],
					padding: props.options?.padding,
				}}
			/>
			<TablePillCell
				text={lastStatus()}
				variant={lastStatus() === "failed" ? "danger-subtle" : "outline"}
				options={{
					include: props.include[4],
					padding: props.options?.padding,
				}}
			/>
		</TableRow>
	);
};

export default JobScheduleTableRow;
