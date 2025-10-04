import T from "@/translations";
import type { Component } from "solid-js";
import type useRowTarget from "@/hooks/useRowTarget";
import type { TableRowProps } from "@/types/components";
import type { JobResponse } from "@types";
import userStore from "@/store/userStore";
import { Tr } from "@/components/Groups/Table";
import TextCol from "@/components/Tables/Columns/TextCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import PillCol from "@/components/Tables/Columns/PillCol";

interface JobRowProps extends TableRowProps {
	job: JobResponse;
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
					label: T()("preview"),
					type: "button",
					onClick: () => {
						props.rowTarget.setTargetId(props.job.id);
						props.rowTarget.setTrigger("preview", true);
					},
					permission: userStore.get.hasPermission(["read_email"]).all,
				},
			]}
		>
			<PillCol
				text={props.job.status}
				theme={
					props.job.status === "completed"
						? "primary"
						: props.job.status === "failed"
							? "red"
							: props.job.status === "processing"
								? "secondary"
								: "grey"
				}
				options={{ include: props?.include[0] }}
			/>
			<TextCol
				text={props.job.eventType}
				options={{ include: props?.include[1], maxLines: 1 }}
			/>
			<TextCol
				text={props.job.queueAdapterKey}
				options={{ include: props?.include[2], maxLines: 1 }}
			/>
			<PillCol
				text={props.job.attempts}
				theme={"grey"}
				options={{ include: props?.include[3] }}
			/>
			<PillCol
				text={props.job.maxAttempts}
				theme={"grey"}
				options={{ include: props?.include[4] }}
			/>
			<PillCol
				text={props.job.priority ?? "-"}
				theme={"grey"}
				options={{ include: props?.include[5] }}
			/>
			<DateCol
				date={props.job.createdAt}
				options={{ include: props?.include[6] }}
			/>
			<DateCol
				date={props.job.scheduledFor}
				options={{ include: props?.include[7] }}
			/>
			<DateCol
				date={props.job.completedAt}
				options={{ include: props?.include[8] }}
			/>
		</Tr>
	);
};

export default JobRow;
