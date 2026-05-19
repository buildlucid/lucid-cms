import type {
	CFConfig,
	Collection,
	FieldTypes,
	InternalCollectionDocument,
} from "@types";
import { type Component, For, Show } from "solid-js";
import { Tr } from "@/components/Groups/Table";
import type { TableTheme } from "@/components/Groups/Table/Table";
import type { ActionDropdownProps } from "@/components/Partials/ActionDropdown";
import DateCol from "@/components/Tables/Columns/DateCol";
import DocumentAuthorCol from "@/components/Tables/Columns/DocumentAuthorCol";
import DocumentDynamicColumns from "@/components/Tables/Columns/DocumentDynamicColumns";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import WorkflowAssigneeCol from "@/components/Tables/Columns/WorkflowAssigneeCol";
import WorkflowStageCol from "@/components/Tables/Columns/WorkflowStageCol";
import type { TableRowProps } from "@/types/components";

interface DocumentRowProps extends TableRowProps {
	document: InternalCollectionDocument;
	collection: Collection;
	fieldInclude: CFConfig<FieldTypes>[];
	include: boolean[];
	actions?: ActionDropdownProps["actions"];
	contentLocale?: string;
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
}

const DocumentRow: Component<DocumentRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const includeOffset = () => (props.selection ? 1 : 0);
	const workflowOffset = () => (props.collection.config.workflow ? 2 : 0);
	const authorStartIndex = () =>
		includeOffset() + props.fieldInclude.length + workflowOffset();

	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={props.actions}
			onClick={props.callbacks?.onClick}
			current={props.current}
			theme={props.theme}
		>
			<Show when={props.selection}>
				{(selection) => (
					<SelectCol
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
					if (field.type === "tab") return null;
					if (field.type === "repeater") return null;

					return (
						<DocumentDynamicColumns
							field={field}
							document={props.document}
							include={props.include}
							index={includeOffset() + i()}
							collectionTranslations={props.collection.config.translations}
						/>
					);
				}}
			</For>
			<Show when={props.collection.config.workflow}>
				<WorkflowStageCol
					document={props.document}
					collection={props.collection}
					include={props.include}
					index={includeOffset() + props.fieldInclude.length}
				/>
				<WorkflowAssigneeCol
					document={props.document}
					include={props.include}
					index={includeOffset() + props.fieldInclude.length + 1}
				/>
			</Show>
			<DocumentAuthorCol
				user={props.document.createdBy}
				options={{
					include: props.include[authorStartIndex()],
					padding: props.options?.padding,
					minWidth: 180,
				}}
			/>
			<DocumentAuthorCol
				user={props.document.updatedBy}
				options={{
					include: props.include[authorStartIndex() + 1],
					padding: props.options?.padding,
					minWidth: 180,
				}}
			/>
			<DateCol
				date={props.document.updatedAt}
				options={{
					include: props?.include[authorStartIndex() + 2],
					padding: props.options?.padding,
				}}
			/>
		</Tr>
	);
};

export default DocumentRow;
