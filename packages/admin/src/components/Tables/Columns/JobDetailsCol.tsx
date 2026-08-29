import type { Job } from "@types";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";

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
		<Td
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
		</Td>
	);
};

export default JobDetailsCol;
