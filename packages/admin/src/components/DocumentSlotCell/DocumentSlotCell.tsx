import type { Component } from "solid-js";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import Table from "../Table/Table";
import type { DocumentSlotComponent, DocumentSlotProps } from "./types";

/** The admin owns table structure; extensions render only cell contents. */
const DocumentSlotCell: Component<{
	column?: string;
	entry: { key: string; component: DocumentSlotComponent };
	data: DocumentSlotProps;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column}>
			<div class="w-full min-w-0 text-sm" data-admin-slot={props.entry.key}>
				<AdminExtensionBoundary name={props.entry.key}>
					<props.entry.component {...props.data} />
				</AdminExtensionBoundary>
			</div>
		</Table.Cell>
	);
};

export default DocumentSlotCell;
