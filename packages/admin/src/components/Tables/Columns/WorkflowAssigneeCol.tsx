import type { InternalCollectionDocument, Refs } from "@types";
import { type Component, createMemo } from "solid-js";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";
import UserStackCol from "./UserStackCol";

const WorkflowAssigneeCol: Component<{
	document: InternalCollectionDocument;
	refs?: Refs;
	include: boolean[];
	index: number;
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
		<UserStackCol
			users={assignees()}
			options={{ include: props.include[props.index], minWidth: 200 }}
		/>
	);
};

export default WorkflowAssigneeCol;
