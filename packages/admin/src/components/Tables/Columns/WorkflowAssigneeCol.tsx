import type { InternalCollectionDocument } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import { Td } from "@/components/Groups/Table";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
import helpers from "@/utils/helpers";

const WorkflowAssigneeCol: Component<{
	document: InternalCollectionDocument;
	include: boolean[];
	index: number;
}> = (props) => {
	// -----------------------------------
	// Memos
	const assignee = createMemo(() => props.document.workflow?.assignees[0]);

	// -----------------------------------
	// Render
	return (
		<Td options={{ include: props.include[props.index] }}>
			<Show when={assignee()} fallback="-">
				{(assignee) => (
					<UserDisplay
						user={{
							username: helpers.formatUserName(
								{
									username:
										assignee().user.username ??
										assignee().user.email ??
										T()("unknown"),
									firstName: assignee().user.firstName,
									lastName: assignee().user.lastName,
								},
								"username",
							),
							firstName: assignee().user.firstName,
							lastName: assignee().user.lastName,
						}}
						mode="short"
						size="small"
					/>
				)}
			</Show>
		</Td>
	);
};

export default WorkflowAssigneeCol;
