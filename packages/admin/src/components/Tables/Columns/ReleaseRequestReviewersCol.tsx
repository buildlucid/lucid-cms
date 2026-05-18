import type { PublishOperationAssignee } from "@types";
import type { Component } from "solid-js";
import UserStackCol from "./UserStackCol";

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
		<UserStackCol
			users={props.assignees.map((assignee) => assignee.user)}
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
			}}
		/>
	);
};

export default ReleaseRequestReviewersCol;
