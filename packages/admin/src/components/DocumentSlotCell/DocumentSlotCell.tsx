import type { Component } from "solid-js";
import type { AdminOptions } from "@/extensions/types/config";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import Table from "../Table/Table";
import type { DocumentListSlotComponent, DocumentListSlotProps } from "./types";

/** The admin owns table structure; extensions render only cell contents. */
const DocumentSlotCell: Component<{
	column?: string;
	entry: {
		key: string;
		component: DocumentListSlotComponent<AdminOptions | undefined>;
	};
	data: DocumentListSlotProps<AdminOptions | undefined>;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column}>
			<div class="w-full min-w-0 text-sm" data-admin-slot={props.entry.key}>
				<AdminExtensionBoundary name={props.entry.key} placement="cell">
					<props.entry.component {...props.data} />
				</AdminExtensionBoundary>
			</div>
		</Table.Cell>
	);
};

export default DocumentSlotCell;
