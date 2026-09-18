import { type Component, Show } from "solid-js";
import AdminExtensionBoundary from "../AdminExtensionBoundary/AdminExtensionBoundary";
import { TableCell } from "../TableCell/TableCell";
import type { DocumentSlotComponent, DocumentSlotProps } from "./types";

/** The admin owns table structure; extensions render only cell contents. */
const DocumentSlotCell: Component<{
	entry: { key: string; component: DocumentSlotComponent };
	data: DocumentSlotProps;
	include: boolean;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<TableCell options={{ include: props.include }}>
			<Show when={props.include}>
				<div class="w-full min-w-0 text-sm" data-admin-slot={props.entry.key}>
					<AdminExtensionBoundary name={props.entry.key}>
						<props.entry.component {...props.data} />
					</AdminExtensionBoundary>
				</div>
			</Show>
		</TableCell>
	);
};
export default DocumentSlotCell;
