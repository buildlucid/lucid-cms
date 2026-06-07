import type { Job } from "@types";
import type { Component } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import T from "@/translations";

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
				<span class="truncate text-sm text-title" title={props.job.eventType}>
					{props.job.eventType || "-"}
				</span>
				<div class="flex min-w-0 items-center gap-1.5 text-xs text-body">
					<span class="shrink-0">{T()("queue.adapter")}</span>
					<span class="truncate" title={props.job.queueAdapterKey}>
						{props.job.queueAdapterKey || "-"}
					</span>
				</div>
			</div>
		</Td>
	);
};

export default JobDetailsCol;
