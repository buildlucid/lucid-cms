import type { Job } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";

interface JobDetailsCellProps {
	column?: string;
	job: Job;
}

const JobDetailsCell: Component<JobDetailsCellProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={260}>
			<div class="flex min-w-0 flex-col gap-1">
				<span class="truncate text-sm text-title" title={props.job.jobName}>
					{props.job.jobName || "-"} v{props.job.jobVersion}
				</span>
			</div>
		</Table.Cell>
	);
};

export default JobDetailsCell;
