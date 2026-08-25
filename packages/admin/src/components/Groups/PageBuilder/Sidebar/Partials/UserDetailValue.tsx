import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
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
					user={{
						username:
							user().username ?? user().email ?? T()("media.types.unknown"),
						firstName: user().firstName,
						lastName: user().lastName,
						profilePicture: user().profilePicture,
					}}
					mode="short"
					size="x-small"
					nameFormat="simple"
				/>
			)}
		</Show>
	);
};

export default UserDetailValue;
