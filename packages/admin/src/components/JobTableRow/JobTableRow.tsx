import type { Job } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import T from "@/translations";
import JobDetailsCell from "./parts/JobDetailsCell";

interface JobRowProps {
	index: number;
	job: Job;
	rowTarget?: ReturnType<typeof useRowTarget<"details">>;
}

const JobTableRow: Component<JobRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
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
								permission: Permissions.JobsRead,
								sortOrder: 0,
							},
						]
					: []
			}
		>
			<Table.Pill
				column="status"
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
			/>
			<JobDetailsCell column="job" job={props.job} />
			<Table.Text
				column="trigger"
				text={
					props.job.scheduleKey ??
					(props.job.triggerType === "schedule"
						? T()("common.schedule")
						: T()("jobs.trigger.enqueue"))
				}
				minWidth={220}
			/>
			<Table.Pill
				column="attempts"
				text={`${props.job.attempts}/${props.job.maxAttempts}`}
				variant={"outline"}
			/>
			<Table.Date column="createdAt" date={props.job.createdAt} />
			<Table.Date
				column="finishedAt"
				date={
					props.job.completedAt ?? props.job.failedAt ?? props.job.cancelledAt
				}
			/>
		</Table.Row>
	);
};

export default JobTableRow;
