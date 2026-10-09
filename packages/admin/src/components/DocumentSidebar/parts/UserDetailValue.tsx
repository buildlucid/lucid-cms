import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import ActorDisplay from "@/components/ActorDisplay/ActorDisplay";
import {
	findDocumentAgentRef,
	findDocumentUserRef,
} from "@/utils/document-ref-helpers";

const UserDetailValue: Component<{
	userId: number | null;
	/** The agent run that acted for the user, resolved through `refs.agents`. */
	runId: string | null;
	refs?: Refs;
}> = (props) => {
	// ----------------------------------
	// Memos
	const user = createMemo(() => findDocumentUserRef(props.refs, props.userId));
	const agent = createMemo(() => findDocumentAgentRef(props.refs, props.runId));

	// ----------------------------------
	// Render
	return (
		<Show
			when={user() || agent()}
			fallback={props.userId ? `#${props.userId}` : "-"}
		>
			<ActorDisplay user={user()} agent={agent()} />
		</Show>
	);
};

export default UserDetailValue;
