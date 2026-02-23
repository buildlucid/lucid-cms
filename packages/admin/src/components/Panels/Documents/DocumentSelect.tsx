import type {
	CollectionResponse,
	DocumentResponse,
} from "@lucidcms/core/types";
import { FaSolidCalendar } from "solid-icons/fa";
import { type Component, createEffect, createMemo, Index } from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
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

interface DocumentSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		collectionKey: string | undefined;
		selected?: number;
	};
	callbacks: {
		onSelect: (document: DocumentResponse) => void;
	};
}

const DocumentSelectPanel: Component<DocumentSelectPanelProps> = (props) => {
	// ---------------------------------
	// Render
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
					selected={props.state.selected}
					onSelect={(document) => {
						props.callbacks.onSelect(document);
						props.state.setOpen(false);
					}}
				/>
			)}
		</BottomPanel>
	);
};

interface DocumentSelectContentProps {
	collectionKey: string | undefined;
	selected?: number;
	onSelect: (document: DocumentResponse) => void;
}

const DocumentSelectContent: Component<DocumentSelectContentProps> = (
	props,
) => {
	// ------------------------------
	// Hooks
	const searchParams = useSearchParamsState({
		filters: {},
		sorts: {},
		pagination: {
			perPage: 20,
		},
	});

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => props.collectionKey);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);

	// ----------------------------------
	// Queries
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

	// ----------------------------------
	// Memos
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

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (collection.isSuccess) {
			const filterConfig: FilterSchema = {};
			for (const field of getCollectionFieldFilters()) {
				const fieldKey = formatFieldFilters({
					fieldKey: field.key,
				});
				switch (field.type) {
					default: {
						filterConfig[fieldKey] = {
							type: "text",
							value: "",
						};
						break;
					}
				}
			}
			searchParams.setFilterSchema(filterConfig);
		}
	});

	// ----------------------------------
	// Render
	return (
		<div class="flex flex-col h-full pb-4">
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
									collection={collection.data?.data as CollectionResponse}
									include={include}
									contentLocale={contentLocale()}
									selected={selected[i]}
									options={{
										isSelectable,
										padding: "16",
									}}
									callbacks={{
										setSelected: setSelected,
										onClick: () => props.onSelect(doc()),
									}}
									theme="secondary"
									current={doc().id === props.selected}
								/>
							)}
						</Index>
					)}
				</Table>
			</DynamicContent>
		</div>
	);
};

export default DocumentSelectPanel;
