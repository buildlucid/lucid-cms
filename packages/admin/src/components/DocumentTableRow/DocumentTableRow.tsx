import type { Collection, InternalCollectionDocument, Refs } from "@types";
import { type Component, For, Show } from "solid-js";
import type { ActionDropdownProps } from "@/components/ActionDropdown/ActionDropdown";
import type { TableRowReorder, TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableSelectionCell from "@/components/TableSelectionCell/TableSelectionCell";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import type { TableRowProps } from "@/types/components";
import DocumentAuthorCol from "./parts/DocumentAuthorCol";
import DocumentDynamicColumns from "./parts/DocumentDynamicColumns";
import DocumentEnvironmentStatusCol from "./parts/DocumentEnvironmentStatusCol";
import WorkflowAssigneeCol from "./parts/WorkflowAssigneeCol";
import WorkflowStageCol from "./parts/WorkflowStageCol";

interface DocumentRowProps extends TableRowProps {
	document: InternalCollectionDocument;
	refs?: Refs;
	collection: Collection;
	collectionsByKey?: Map<string, Collection>;
	fieldInclude: CollectionLeafFieldConfig[];
	include: boolean[];
	actions?: ActionDropdownProps["actions"];
	contentLocale?: string;
	showEnvironmentStatus?: boolean;
	callbacks?: {
		setSelected?: (i: number) => void;
		onClick?: () => void;
	};
	selection?: {
		selected: boolean;
		onChange: () => void;
	};
	current?: boolean;
	theme?: TableTheme;
	reorder?: {
		rowReorder: TableRowReorder;
	};
}

const DocumentTableRow: Component<DocumentRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const includeOffset = () => (props.selection ? 1 : 0);
	const environmentOffset = () =>
		props.showEnvironmentStatus
			? props.collection.publishing.targets.length
			: 0;
	const workflowOffset = () => (props.collection.publishing.workflow ? 2 : 0);
	const authorStartIndex = () =>
		includeOffset() +
		environmentOffset() +
		props.fieldInclude.length +
		workflowOffset();

	// ----------------------------------
	// Render
	return (
		<TableRow
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={props.actions}
			onClick={props.callbacks?.onClick}
			current={props.current}
			theme={props.theme}
			reorder={props.reorder}
			viewTransitionName={
				props.reorder?.rowReorder.enabled
					? `document-table-row-${props.document.collectionKey}-${props.document.id}`
					: undefined
			}
		>
			<Show when={props.selection}>
				{(selection) => (
					<TableSelectionCell
						type="td"
						value={selection().selected}
						onChange={selection().onChange}
						theme={props.theme}
						padding={props.options?.padding}
					/>
				)}
			</Show>
			<For each={props.fieldInclude}>
				{(field, i) => {
					return (
						<DocumentDynamicColumns
							field={field}
							document={props.document}
							refs={props.refs}
							include={props.include}
							index={includeOffset() + i()}
							collectionLocalized={props.collection.localized !== false}
							collectionsByKey={props.collectionsByKey}
						/>
					);
				}}
			</For>
			<Show when={props.showEnvironmentStatus}>
				<For each={props.collection.publishing.targets}>
					{(environment, i) => (
						<DocumentEnvironmentStatusCol
							document={props.document}
							environmentKey={environment.key}
							include={props.include}
							index={includeOffset() + props.fieldInclude.length + i()}
							padding={props.options?.padding}
						/>
					)}
				</For>
			</Show>
			<Show when={props.collection.publishing.workflow}>
				<WorkflowStageCol
					document={props.document}
					collection={props.collection}
					include={props.include}
					index={
						includeOffset() + environmentOffset() + props.fieldInclude.length
					}
				/>
				<WorkflowAssigneeCol
					document={props.document}
					refs={props.refs}
					include={props.include}
					index={
						includeOffset() +
						environmentOffset() +
						props.fieldInclude.length +
						1
					}
				/>
			</Show>
			<DocumentAuthorCol
				userId={props.document.createdBy}
				refs={props.refs}
				options={{
					include: props.include[authorStartIndex()],
					padding: props.options?.padding,
					minWidth: 180,
				}}
			/>
			<DocumentAuthorCol
				userId={props.document.updatedBy}
				refs={props.refs}
				options={{
					include: props.include[authorStartIndex() + 1],
					padding: props.options?.padding,
					minWidth: 180,
				}}
			/>
			<TableDateCell
				date={props.document.updatedAt}
				options={{
					include: props?.include[authorStartIndex() + 2],
					padding: props.options?.padding,
				}}
			/>
		</TableRow>
	);
};

export default DocumentTableRow;
