import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import { Td } from "@/components/Groups/Table/Td";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";

const DocumentAuthorCol: Component<{
	userId: number | null;
	refs?: Refs;
	options?: {
		include?: boolean;
		padding?: "16" | "24";
		minWidth?: number;
	};
}> = (props) => {
	// ----------------------------------
	// Memos
	const user = createMemo(() => findDocumentUserRef(props.refs, props.userId));

	// ----------------------------------
	// Render
	return (
		<Td
			options={{
				include: props.options?.include,
				padding: props.options?.padding,
				minWidth: props.options?.minWidth,
			}}
		>
			<Show
				when={user()}
				fallback={
					<span class="text-sm text-body">
						{props.userId ? `#${props.userId}` : T()("common.none")}
					</span>
				}
			>
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
		</Td>
	);
};

export default DocumentAuthorCol;
