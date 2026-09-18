import { documentSlots } from "virtual:lucid-admin";
import type { Collection, InternalCollectionDocument, Refs } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import type { ActionDropdownProps } from "@/components/ActionDropdown/ActionDropdown";
import DocumentSlotCell from "@/components/DocumentSlotCell/DocumentSlotCell";
import type { TableRowReorder, TableTheme } from "@/components/Table/Table";
import TableDateCell from "@/components/TableDateCell/TableDateCell";
import { TableRow } from "@/components/TableRow/TableRow";
import TableSelectionCell from "@/components/TableSelectionCell/TableSelectionCell";
import { createFieldState } from "@/extensions/editor/field-state";
import { resolveSlots } from "@/extensions/slot-policy";
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
	extensions?: boolean;
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
	const additions = createMemo(() =>
		props.extensions
			? resolveSlots(
					documentSlots.filter(
						(entry) => entry.slot === "document.columnAddition",
					),
					{ collection: props.collection.key },
				)
			: [],
	);
	const data = () => ({
		document: props.document,
		collection: props.collection,
		contentLocale: props.contentLocale ?? "",
		refs: props.refs,
	});
	const fieldColumnCount = () => props.fieldInclude.length + additions().length;
	const includeOffset = () => (props.selection ? 1 : 0);
	const environmentOffset = () =>
		props.showEnvironmentStatus
			? props.collection.publishing.targets.length
			: 0;
	const workflowOffset = () => (props.collection.publishing.workflow ? 2 : 0);
	const authorStartIndex = () =>
		includeOffset() +
		environmentOffset() +
		fieldColumnCount() +
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
					const override = createMemo(() =>
						props.extensions
							? resolveSlots(
									documentSlots.filter(
										(entry) => entry.slot === "document.columnOverride",
									),
									{ collection: props.collection.key, field: field.key },
								)[0]
							: undefined,
					);
					return (
						<Show
							when={override()}
							fallback={
								<DocumentDynamicColumns
									field={field}
									document={props.document}
									refs={props.refs}
									include={props.include}
									index={includeOffset() + i()}
									collectionLocalized={props.collection.localized !== false}
									collectionsByKey={props.collectionsByKey}
								/>
							}
						>
							{(entry) => (
								<DocumentSlotCell
									entry={entry()}
									include={props.include[includeOffset() + i()] ?? true}
									data={{
										...data(),
										slot: "document.columnOverride",
										field: createFieldState({
											config: field,
											data: props.document.fields?.find(
												(value) => value.key === field.key,
											),
											contentLocale: props.contentLocale ?? "",
											localized: props.collection.localized !== false,
											readOnly: true,
										}),
									}}
								/>
							)}
						</Show>
					);
				}}
			</For>
			<For each={additions()}>
				{(entry, index) => (
					<DocumentSlotCell
						entry={entry}
						include={
							props.include[
								includeOffset() + props.fieldInclude.length + index()
							] ?? true
						}
						data={{ ...data(), slot: "document.columnAddition" }}
					/>
				)}
			</For>
			<Show when={props.showEnvironmentStatus}>
				<For each={props.collection.publishing.targets}>
					{(environment, i) => (
						<DocumentEnvironmentStatusCol
							document={props.document}
							environmentKey={environment.key}
							include={props.include}
							index={includeOffset() + fieldColumnCount() + i()}
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
					index={includeOffset() + environmentOffset() + fieldColumnCount()}
				/>
				<WorkflowAssigneeCol
					document={props.document}
					refs={props.refs}
					include={props.include}
					index={includeOffset() + environmentOffset() + fieldColumnCount() + 1}
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
