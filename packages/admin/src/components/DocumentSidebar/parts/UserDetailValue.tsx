import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";

const UserDetailValue: Component<{
	userId: number | null;
	refs?: Refs;
}> = (props) => {
	// ----------------------------------
	// Memos
	const user = createMemo(() => findDocumentUserRef(props.refs, props.userId));

	// ----------------------------------
	// Render
	return (
		<Show when={user()} fallback={props.userId ? `#${props.userId}` : "-"}>
			{(user) => (
				<UserDisplay
					user={user()}
					variant="horizontal"
					size="xs"
					nameFormat="simple"
				/>
			)}
		</Show>
	);
};

export default UserDetailValue;
