import type { JobScheduleSummary } from "@types";
import type { Component } from "solid-js";
import { TableCell } from "@/components/TableCell/TableCell";

interface JobScheduleDetailsColProps {
	schedule: JobScheduleSummary;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}

const JobScheduleDetailsCol: Component<JobScheduleDetailsColProps> = (
	props,
) => {
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
				<span class="truncate text-sm text-title" title={props.schedule.name}>
					{props.schedule.name}
				</span>
				<span
					class="truncate text-xs text-unfocused"
					title={`${props.schedule.cron} · ${props.schedule.timezone}`}
				>
					{props.schedule.cron} · {props.schedule.timezone}
				</span>
			</div>
		</TableCell>
	);
};

export default JobScheduleDetailsCol;
