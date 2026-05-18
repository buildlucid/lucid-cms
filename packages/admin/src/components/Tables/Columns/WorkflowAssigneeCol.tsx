import type { InternalCollectionDocument } from "@types";
import { type Component, createMemo } from "solid-js";
import UserStackCol from "./UserStackCol";

const WorkflowAssigneeCol: Component<{
	document: InternalCollectionDocument;
	include: boolean[];
	index: number;
}> = (props) => {
	// -----------------------------------
	// Memos
	const assignees = createMemo(
		() =>
			props.document.workflow?.assignees.map((assignee) => assignee.user) ?? [],
	);

	// -----------------------------------
	// Render
	return (
		<UserStackCol
			users={assignees()}
			options={{ include: props.include[props.index], minWidth: 200 }}
		/>
	);
};

export default WorkflowAssigneeCol;
