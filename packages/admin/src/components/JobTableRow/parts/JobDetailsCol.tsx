import type { Job } from "@types";
import type { Component } from "solid-js";
import { TableCell } from "@/components/TableCell/TableCell";

interface JobDetailsColProps {
	job: Job;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const JobDetailsCol: Component<JobDetailsColProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: 260,
			}}
		>
			<div class="flex min-w-0 flex-col gap-1">
				<span class="truncate text-sm text-title" title={props.job.jobName}>
					{props.job.jobName || "-"} v{props.job.jobVersion}
				</span>
			</div>
		</TableCell>
	);
};

export default JobDetailsCol;
