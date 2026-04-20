import type {
	Collection,
	DocumentFieldValue,
	DocumentRef,
	InternalCollectionDocument,
} from "@types";
import { FaSolidCalendar } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import { Filter, PerPage } from "@/components/Groups/Query";
import { Table } from "@/components/Groups/Table";
import DocumentRow from "@/components/Tables/Rows/DocumentRow";
import type { FilterSchema } from "@/hooks/useSearchParamsLocation";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import {
	collectionFieldFilters,
	collectionFieldIncludes,
	formatFieldFilters,
	tableHeadColumns,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";

interface DocumentSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		collectionKey: string | undefined;
		multiple?: boolean;
		selected?: DocumentFieldValue[];
		selectedRefs?: DocumentRef[];
	};
	callbacks: {
		onSelect: (selection: {
			value: DocumentFieldValue[];
			refs: DocumentRef[];
		}) => void;
	};
}

const DocumentSelectPanel: Component<DocumentSelectPanelProps> = (props) => {
	return (
		<BottomPanel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			options={{
				padding: "24",
				hideFooter: true,
				growContent: true,
			}}
			copy={{
				title: T()("select_document_title"),
				description: T()("select_document_description"),
			}}
		>
			{() => (
				<DocumentSelectContent
					collectionKey={props.state.collectionKey}
					multiple={props.state.multiple}
					selected={props.state.selected}
					selectedRefs={props.state.selectedRefs}
					onClose={() => props.state.setOpen(false)}
					onSelect={(selection) => {
						props.callbacks.onSelect(selection);
						props.state.setOpen(false);
					}}
				/>
			)}
		</BottomPanel>
	);
};

interface DocumentSelectContentProps {
	collectionKey: string | undefined;
	multiple?: boolean;
	selected?: DocumentFieldValue[];
	selectedRefs?: DocumentRef[];
	onClose: () => void;
	onSelect: (selection: {
		value: DocumentFieldValue[];
		refs: DocumentRef[];
	}) => void;
}

const DocumentSelectContent: Component<DocumentSelectContentProps> = (
	props,
) => {
	const [selectedDocuments, setSelectedDocuments] = createSignal<DocumentRef[]>(
		[],
	);
	const searchParams = useSearchParamsState({
		filters: {},
		sorts: {},
		pagination: {
			perPage: 20,
		},
	});

	const collectionKey = createMemo(() => props.collectionKey);
	const isMultiple = createMemo(() => props.multiple === true);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const selectedDocumentValues = createMemo<DocumentFieldValue[]>(() =>
		selectedDocuments().map((document) => ({
			id: document.id,
			collectionKey: document.collectionKey,
		})),
	);

	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
	});
	const documents = api.documents.useGetMultiple({
		queryParams: {
			queryString: searchParams.getQueryString,
			location: {
				collectionKey: collectionKey,
				versionType: "latest",
			},
			filters: {
				isDeleted: 0,
			},
			include: {
				fields: true,
			},
		},
		enabled: () => searchParams.getSettled() && collection.isSuccess,
	});

	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collection.data?.data),
	);
	const getCollectionFieldFilters = createMemo(() =>
		collectionFieldFilters(collection.data?.data),
	);
	const getTableHeadColumns = createMemo(() =>
		tableHeadColumns(getCollectionFieldIncludes()),
	);
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: collection.data?.data.details.name,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: collection.data?.data.details.singularName,
			}) || T()("collection"),
	);
	const isSuccess = createMemo(
		() => documents.isSuccess || collection.isSuccess,
	);
	const isError = createMemo(() => documents.isError || collection.isError);

	createEffect(() => {
		if (collection.isSuccess) {
			const filterConfig: FilterSchema = {};
			for (const field of getCollectionFieldFilters()) {
				const fieldKey = formatFieldFilters({
					fieldKey: field.key,
				});
				filterConfig[fieldKey] = {
					type: "text",
					value: "",
				};
			}
			searchParams.setFilterSchema(filterConfig);
		}
	});
	createEffect(() => {
		setSelectedDocuments(props.selectedRefs ?? []);
	});

	const toggleSelectedDocument = (document: InternalCollectionDocument) => {
		const nextRef = documentResponseToRef(document);

		setSelectedDocuments((prev) => {
			const exists = prev.some(
				(selectedDocument) =>
					selectedDocument.id === nextRef.id &&
					selectedDocument.collectionKey === nextRef.collectionKey,
			);
			if (exists) {
				return prev.filter(
					(selectedDocument) =>
						selectedDocument.id !== nextRef.id ||
						selectedDocument.collectionKey !== nextRef.collectionKey,
				);
			}

			if (!isMultiple()) {
				return [nextRef];
			}

			return [...prev, nextRef];
		});
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedDocumentValues(),
			refs: selectedDocuments(),
		});
	};

	return (
		<div class="flex flex-col h-full">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap">
					<Filter
						filters={getCollectionFieldFilters().map((field) => {
							const fieldKey = formatFieldFilters({
								fieldKey: field.key,
							});
							switch (field.type) {
								case "checkbox": {
									return {
										label: helpers.getLocaleValue({
											value: field.details.label,
											fallback: field.key,
										}),
										key: fieldKey,
										type: "boolean",
									};
								}
								case "select": {
									return {
										label: helpers.getLocaleValue({
											value: field.details.label,
											fallback: field.key,
										}),
										key: fieldKey,
										type: "select",
										options: field.options?.map((option, i) => ({
											value: option.value,
											label: helpers.getLocaleValue({
												value: option.label,
												fallback: T()("option_label", {
													count: i,
												}),
											}),
										})),
									};
								}
								default: {
									return {
										label: helpers.getLocaleValue({
											value: field.details.label,
											fallback: field.key,
										}),
										key: fieldKey,
										type: "text",
									};
								}
							}
						})}
						searchParams={searchParams}
					/>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<DynamicContent
				class="bg-card-base border border-border rounded-md"
				state={{
					isError: isError(),
					isSuccess: isSuccess(),
					searchParams: searchParams,
					isEmpty: documents.data?.data.length === 0,
					isLoading: collection.isLoading,
				}}
				options={{}}
				slot={{
					footer: (
						<Paginated
							state={{
								searchParams: searchParams,
								meta: documents.data?.meta,
							}}
							options={{
								embedded: true,
							}}
						/>
					),
				}}
				copy={{
					noEntries: {
						title: T()("no_documents", {
							collectionMultiple: collectionName(),
						}),
						description: T()("no_documents_description_doc_select", {
							collectionMultiple: collectionName().toLowerCase(),
							collectionSingle: collectionSingularName().toLowerCase(),
						}),
						button: T()("create_document", {
							collectionSingle: collectionSingularName(),
						}),
					},
				}}
			>
				<Table
					key={`documents.list.${collection.data?.data?.key}`}
					rows={documents.data?.data.length || 0}
					searchParams={searchParams}
					head={[
						{
							label: "",
							key: "select",
						},
						...getTableHeadColumns(),
						{
							label: T()("updated_at"),
							key: "updated_at",
							icon: <FaSolidCalendar />,
						},
					]}
					state={{
						isLoading: documents.isFetching,
						isSuccess: documents.isSuccess,
					}}
					options={{
						isSelectable: false,
						padding: "16",
					}}
					theme="secondary"
				>
					{({ include, isSelectable, selected, setSelected }) => (
						<Index each={documents.data?.data || []}>
							{(doc, i) => (
								<DocumentRow
									index={i}
									document={doc()}
									fieldInclude={getCollectionFieldIncludes()}
									collection={collection.data?.data as Collection}
									include={include}
									contentLocale={contentLocale()}
									selected={selected[i]}
									options={{
										isSelectable,
										padding: "16",
									}}
									callbacks={{
										setSelected: setSelected,
										onClick: () => toggleSelectedDocument(doc()),
									}}
									theme="secondary"
									current={false}
									selection={{
										selected: selectedDocuments().some(
											(selectedDocument) =>
												selectedDocument.id === doc().id &&
												selectedDocument.collectionKey === doc().collectionKey,
										),
										onChange: () => toggleSelectedDocument(doc()),
									}}
								/>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>
			<PanelFooterActions
				selectedCount={selectedDocuments().length}
				onClose={props.onClose}
				onConfirm={confirmSelection}
			/>
		</div>
	);
};

export default DocumentSelectPanel;
