import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import Table from "@/components/Table/Table";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import T from "@/translations";
import { findDocumentUserRef } from "@/utils/document-ref-helpers";

const DocumentAuthorCell: Component<{
	column?: string;
	userId: number | null;
	refs?: Refs;
	minWidth?: number;
}> = (props) => {
	// ----------------------------------
	// Memos
	const user = createMemo(() => findDocumentUserRef(props.refs, props.userId));

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={props.minWidth}>
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
						user={user()}
						variant="horizontal"
						size="xs"
						nameFormat="name"
					/>
				)}
			</Show>
		</Table.Cell>
	);
};

export default DocumentAuthorCell;
