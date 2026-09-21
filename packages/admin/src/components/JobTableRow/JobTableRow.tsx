import type { Job } from "@types";
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
import JobDetailsCol from "./parts/JobDetailsCol";

interface JobRowProps extends TableRowProps {
	job: Job;
	include: boolean[];
	theme?: TableTheme;
	rowTarget?: ReturnType<typeof useRowTarget<"details">>;
}

const JobTableRow: Component<JobRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			theme={props.theme}
			actions={
				props.rowTarget
					? [
							{
								label: T()("common.details"),
								type: "button",
								icon: "info",
								onClick: () => {
									props.rowTarget?.setTargetId(props.job.id);
									props.rowTarget?.setTrigger("details", true);
								},
								permission: userStore.get.hasPermission([Permissions.JobsRead])
									.all,
							},
						]
					: []
			}
		>
			<TablePillCell
				text={props.job.status}
				variant={
					props.job.status === "completed"
						? "primary-subtle"
						: props.job.status === "failed"
							? "danger-subtle"
							: props.job.status === "running"
								? "primary-subtle"
								: "outline"
				}
				options={{
					include: props?.include[0],
					padding: props.options?.padding,
				}}
			/>
			<JobDetailsCol
				job={props.job}
				options={{
					include: props?.include[1],
					padding: props.options?.padding,
				}}
			/>
			<TableTextCell
				text={
					props.job.scheduleKey ??
					(props.job.triggerType === "schedule"
						? T()("common.schedule")
						: T()("jobs.trigger.enqueue"))
				}
				options={{
					include: props?.include[2],
					padding: props.options?.padding,
					minWidth: 220,
				}}
			/>
			<TablePillCell
				text={`${props.job.attempts}/${props.job.maxAttempts}`}
				variant={"outline"}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={props.job.createdAt}
				options={{
					include: props?.include[4],
					padding: props.options?.padding,
				}}
			/>
			<TableDateCell
				date={
					props.job.completedAt ?? props.job.failedAt ?? props.job.cancelledAt
				}
				options={{
					include: props?.include[5],
					padding: props.options?.padding,
				}}
			/>
		</TableRow>
	);
};

export default JobTableRow;
