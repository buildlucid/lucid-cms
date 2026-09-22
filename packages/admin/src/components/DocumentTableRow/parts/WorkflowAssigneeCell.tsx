import type { InternalCollectionDocument, Refs } from "@types";
import { type Component, createMemo } from "solid-js";
import TableUserStackCell from "@/components/TableUserStackCell/TableUserStackCell";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";

const WorkflowAssigneeCell: Component<{
	column?: string;
	document: InternalCollectionDocument;
	refs?: Refs;
}> = (props) => {
	// -----------------------------------
	// Memos
	const assignees = createMemo(
		() =>
			props.document.workflow?.assignees.map(
				(assignee) =>
					findDocumentUserRef(props.refs, assignee.userId) ?? {
						id: assignee.userId,
						username: `#${assignee.userId}`,
					},
			) ?? [],
	);

	// -----------------------------------
	// Render
	return (
		<TableUserStackCell
			column={props.column}
			users={assignees()}
			minWidth={200}
		/>
	);
};

export default WorkflowAssigneeCell;
