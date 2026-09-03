import type { JobScheduleSummary } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Groups/Table/Table";
import { Tr } from "@/components/Groups/Table/Tr";
import DateCol from "@/components/Tables/Columns/DateCol";
import JobScheduleDetailsCol from "@/components/Tables/Columns/JobScheduleDetailsCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

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

const JobScheduleRow: Component<JobScheduleRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const lastStatus = () => props.schedule.lastRun?.status;

	// ----------------------------------
	// Render
	return (
		<Tr
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
			<PillCol
				text={
					props.schedule.state === "paused"
						? T()("common.status.paused")
						: T()("common.status.active")
				}
				theme={
					props.schedule.state === "paused"
						? "warning-opaque"
						: "primary-opaque"
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
			<TextCol
				text={`${props.schedule.jobName} v${props.schedule.jobVersion}`}
				options={{
					include: props.include[2],
					minWidth: 260,
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.schedule.nextRunAt}
				includeTime
				options={{
					include: props.include[3],
					padding: props.options?.padding,
				}}
			/>
			<PillCol
				text={lastStatus()}
				theme={lastStatus() === "failed" ? "error-opaque" : "outline"}
				options={{
					include: props.include[4],
					padding: props.options?.padding,
				}}
			/>
		</Tr>
	);
};

export default JobScheduleRow;
