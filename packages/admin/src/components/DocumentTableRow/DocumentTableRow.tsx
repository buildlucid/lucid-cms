import { documentSlots } from "virtual:lucid-admin";
import type { Collection, InternalCollectionDocument, Refs } from "@types";
import { type Component, createMemo, For, Show } from "solid-js";
import type { ActionMenuProps } from "@/components/ActionMenu/ActionMenu";
import DocumentSlotCell from "@/components/DocumentSlotCell/DocumentSlotCell";
import TableSelectionCell from "@/components/Table/parts/TableSelectionCell";
import Table from "@/components/Table/Table";
import { createFieldState } from "@/extensions/editor/field-state";
import { resolveSlots } from "@/extensions/slot-policy";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import DocumentAuthorCell from "./parts/DocumentAuthorCell";
import DocumentDynamicCell from "./parts/DocumentDynamicCell";
import DocumentEnvironmentStatusCell from "./parts/DocumentEnvironmentStatusCell";
import WorkflowAssigneeCell from "./parts/WorkflowAssigneeCell";
import WorkflowStageCell from "./parts/WorkflowStageCell";

interface DocumentRowProps {
	index: number;
	document: InternalCollectionDocument;
	refs?: Refs;
	collection: Collection;
	collectionsByKey?: Map<string, Collection>;
	fieldInclude: CollectionLeafFieldConfig[];
	extensions?: boolean;
	actions?: ActionMenuProps["actions"];
	contentLocale?: string;
	showEnvironmentStatus?: boolean;
	onClick?: () => void;
	/** Opt-in leading checkbox the host drives itself, under the "select" column. */
	selection?: {
		selected: boolean;
		onChange: () => void;
	};
	current?: boolean;
	reorderable?: boolean;
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

	// ----------------------------------
	// Render
	return (
		<Table.Row
			index={props.index}
			actions={props.actions}
			onClick={props.onClick}
			current={props.current}
			viewTransitionName={
				props.reorderable
					? `document-table-row-${props.document.collectionKey}-${props.document.id}`
					: undefined
			}
		>
			<Show when={props.selection}>
				{(selection) => (
					<TableSelectionCell
						column="select"
						type="td"
						value={selection().selected}
						onChange={selection().onChange}
					/>
				)}
			</Show>
			<For each={props.fieldInclude}>
				{(field) => {
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
								<DocumentDynamicCell
									column={field.key}
									field={field}
									document={props.document}
									refs={props.refs}
									collectionLocalized={props.collection.localized !== false}
									collectionsByKey={props.collectionsByKey}
								/>
							}
						>
							{(entry) => (
								<DocumentSlotCell
									column={field.key}
									entry={entry()}
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
				{(entry) => (
					<DocumentSlotCell
						column={`extension:${entry.key}`}
						entry={entry}
						data={{ ...data(), slot: "document.columnAddition" }}
					/>
				)}
			</For>
			<Show when={props.showEnvironmentStatus}>
				<For each={props.collection.publishing.targets}>
					{(environment) => (
						<DocumentEnvironmentStatusCell
							column={`envStatus.${environment.key}`}
							document={props.document}
							environmentKey={environment.key}
						/>
					)}
				</For>
			</Show>
			<Show when={props.collection.publishing.workflow}>
				<WorkflowStageCell
					column="workflowStage"
					document={props.document}
					collection={props.collection}
				/>
				<WorkflowAssigneeCell
					column="workflowAssignee"
					document={props.document}
					refs={props.refs}
				/>
			</Show>
			<DocumentAuthorCell
				column="createdBy"
				userId={props.document.createdBy}
				refs={props.refs}
				minWidth={180}
			/>
			<DocumentAuthorCell
				column="updatedBy"
				userId={props.document.updatedBy}
				refs={props.refs}
				minWidth={180}
			/>
			<Table.Date column="updatedAt" date={props.document.updatedAt} />
		</Table.Row>
	);
};

export default DocumentTableRow;
