import type { Job } from "@types";
import type { Component } from "solid-js";
import { Tr } from "@/components/Groups/Table/Tr";
import DateCol from "@/components/Tables/Columns/DateCol";
import JobDetailsCol from "@/components/Tables/Columns/JobDetailsCol";
import PillCol from "@/components/Tables/Columns/PillCol";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";

interface JobRowProps extends TableRowProps {
	job: Job;
	include: boolean[];
	rowTarget: ReturnType<typeof useRowTarget<"preview">>;
}

const JobRow: Component<JobRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={[
				{
					label: T()("common.preview"),
					type: "button",
					icon: "eye",
					onClick: () => {
						props.rowTarget.setTargetId(props.job.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission([Permissions.EmailRead]).all,
				},
			]}
		>
			<PillCol
				text={props.job.status}
				theme={
					props.job.status === "completed"
						? "primary-opaque"
						: props.job.status === "failed"
							? "error-opaque"
							: props.job.status === "processing"
								? "primary-opaque"
								: "outline"
				}
				options={{ include: props?.include[0] }}
			/>
			<JobDetailsCol job={props.job} options={{ include: props?.include[1] }} />
			<PillCol
				text={props.job.attempts}
				theme={"outline"}
				options={{ include: props?.include[2] }}
			/>
			<PillCol
				text={props.job.maxAttempts}
				theme={"outline"}
				options={{ include: props?.include[3] }}
			/>
			<PillCol
				text={props.job.priority ?? "-"}
				theme={"outline"}
				options={{ include: props?.include[4] }}
			/>
			<DateCol
				date={props.job.createdAt}
				options={{ include: props?.include[5] }}
			/>
			<DateCol
				date={props.job.scheduledFor}
				options={{ include: props?.include[6] }}
			/>
			<DateCol
				date={props.job.completedAt}
				options={{ include: props?.include[7] }}
			/>
		</Tr>
	);
};

export default JobRow;
