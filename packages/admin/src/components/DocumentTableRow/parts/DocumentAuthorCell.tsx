import type { Refs } from "@types";
import { type Component, createMemo, Show } from "solid-js";
import ActorDisplay from "@/components/ActorDisplay/ActorDisplay";
import Table from "@/components/Table/Table";
import T from "@/translations";
import {
	findDocumentAgentRef,
	findDocumentUserRef,
} from "@/utils/document-ref-helpers";

const DocumentAuthorCell: Component<{
	column?: string;
	userId: number | null;
	/** The agent run that acted for the user, resolved through `refs.agents`. */
	runId: string | null;
	refs?: Refs;
	minWidth?: number;
}> = (props) => {
	// ----------------------------------
	// Memos
	const user = createMemo(() => findDocumentUserRef(props.refs, props.userId));
	const agent = createMemo(() => findDocumentAgentRef(props.refs, props.runId));

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={props.minWidth}>
			<Show
				when={user() || agent()}
				fallback={
					<span class="text-sm text-body">
						{props.userId ? `#${props.userId}` : T()("common.none")}
					</span>
				}
			>
				<ActorDisplay user={user()} agent={agent()} />
			</Show>
		</Table.Cell>
	);
};

export default DocumentAuthorCell;
