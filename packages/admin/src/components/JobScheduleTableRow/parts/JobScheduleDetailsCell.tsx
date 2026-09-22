import type { JobScheduleSummary } from "@types";
import type { Component } from "solid-js";
import Table from "@/components/Table/Table";

interface JobScheduleDetailsCellProps {
	column?: string;
	schedule: JobScheduleSummary;
}

const JobScheduleDetailsCell: Component<JobScheduleDetailsCellProps> = (
	props,
) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={260}>
			<div class="flex min-w-0 flex-col gap-1">
				<span class="truncate text-sm text-title" title={props.schedule.name}>
					{props.schedule.name}
				</span>
				<span
					class="truncate text-xs text-muted"
					title={`${props.schedule.cron} · ${props.schedule.timezone}`}
				>
					{props.schedule.cron} · {props.schedule.timezone}
				</span>
			</div>
		</Table.Cell>
	);
};

export default JobScheduleDetailsCell;
