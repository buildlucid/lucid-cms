import type { PublishOperationAssignee } from "@types";
import type { Component } from "solid-js";
import TableUserStackCell from "@/components/TableUserStackCell/TableUserStackCell";

const ReleaseRequestReviewersCol: Component<{
	assignees: PublishOperationAssignee[];
	options?: {
		include?: boolean;
		padding?: "16" | "24";
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableUserStackCell
			users={props.assignees.map((assignee) => assignee.user)}
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
			}}
		/>
	);
};

export default ReleaseRequestReviewersCol;
