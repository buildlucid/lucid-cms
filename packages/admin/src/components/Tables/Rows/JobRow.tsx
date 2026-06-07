import type { Job } from "@types";
import type { Component } from "solid-js";
import type { TableTheme } from "@/components/Groups/Table/Table";
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
	theme?: TableTheme;
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
			theme={props.theme}
			actions={[
				{
					label: T()("common.preview"),
					type: "button",
					icon: "eye",
					onClick: () => {
						props.rowTarget.setTargetId(props.job.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission([Permissions.JobsRead]).all,
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
			<PillCol
				text={props.job.attempts}
				theme={"outline"}
				options={{
					include: props?.include[2],
					padding: props.options?.padding,
				}}
			/>
			<PillCol
				text={props.job.maxAttempts}
				theme={"outline"}
				options={{
					include: props?.include[3],
					padding: props.options?.padding,
				}}
			/>
			<PillCol
				text={props.job.priority ?? "-"}
				theme={"outline"}
				options={{
					include: props?.include[4],
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.job.createdAt}
				options={{
					include: props?.include[5],
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.job.scheduledFor}
				options={{
					include: props?.include[6],
					padding: props.options?.padding,
				}}
			/>
			<DateCol
				date={props.job.completedAt}
				options={{
					include: props?.include[7],
					padding: props.options?.padding,
				}}
			/>
		</Tr>
	);
};

export default JobRow;
