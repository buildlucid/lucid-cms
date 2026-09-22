import type { PublishOperationAssignee } from "@types";
import type { Component } from "solid-js";
import TableUserStackCell from "@/components/TableUserStackCell/TableUserStackCell";

const ReleaseRequestReviewersCell: Component<{
	column?: string;
	assignees: PublishOperationAssignee[];
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableUserStackCell
			column={props.column}
			users={props.assignees.map((assignee) => assignee.user)}
		/>
	);
};

export default ReleaseRequestReviewersCell;
