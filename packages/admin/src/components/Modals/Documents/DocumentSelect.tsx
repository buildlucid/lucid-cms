import T from "@/translations";
import {
	type Component,
	createMemo,
	createEffect,
	Index,
	createSignal,
	Show,
} from "solid-js";
import { FaSolidCalendar, FaSolidSatelliteDish } from "solid-icons/fa";
import type { CollectionResponse, DocumentVersionType } from "@types";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import type { FilterSchema } from "@/hooks/useSearchParamsLocation";
import documentSelectStore from "@/store/forms/documentSelectStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import api from "@/services/api";
import { PerPage, Filter } from "@/components/Groups/Query";
import helpers from "@/utils/helpers";
import { Modal } from "@/components/Groups/Modal";
import { Table } from "@/components/Groups/Table";
import DocumentRow from "@/components/Tables/Rows/DocumentRow";
import { DynamicContent } from "@/components/Groups/Layout";
import { Switch } from "@/components/Groups/Form";
import {
	tableHeadColumns,
	collectionFieldFilters,
	collectionFieldIncludes,
} from "@/utils/document-table-helpers";

const DocumentSelectModal: Component = () => {
	const open = createMemo(() => documentSelectStore.get.open);

	// ---------------------------------
	// Render
	return (
		<Modal
			state={{
				open: open(),
				setOpen: () => documentSelectStore.set("open", false),
			}}
			options={{
				noPadding: true,
				size: "large",
			}}
		>
			<DocumentSelectContent />
		</Modal>
	);
};

const DocumentSelectContent: Component = () => {
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
	const collectionKey = createMemo(() => documentSelectStore.get.collectionKey);
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
				switch (field.type) {
					default: {
						filterConfig[field.key] = {
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
		<div class="min-h-[70vh] flex flex-col">
			{/* Header */}
			<div class="p-4 md:p-6 border-b border-border">
				<h2>{T()("select_document_title")}</h2>
				<p class="mt-1">{T()("select_document_description")}</p>
				<div class="w-full mt-4 flex justify-between">
					<div class="flex gap-2.5">
						<Filter
							filters={getCollectionFieldFilters().map((field) => {
								switch (field.type) {
									case "checkbox": {
										return {
											label: helpers.getLocaleValue({
												value: field.details.label,
												fallback: field.key,
											}),
											key: field.key,
											type: "boolean",
										};
									}
									case "select": {
										return {
											label: helpers.getLocaleValue({
												value: field.details.label,
												fallback: field.key,
											}),
											key: field.key,
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
											key: field.key,
											type: "text",
										};
									}
								}
							})}
							searchParams={searchParams}
						/>
					</div>
					<div>
						<PerPage options={[10, 20, 40]} searchParams={searchParams} />
					</div>
				</div>
			</div>
			{/* Body */}
			<div class="flex-1 flex w-full flex-col">
				<DynamicContent
					state={{
						isError: isError(),
						isSuccess: isSuccess(),
						searchParams: searchParams,
						isEmpty: documents.data?.data.length === 0,
						isLoading: collection.isLoading,
					}}
					options={{}}
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
								label: T()("status"),
								key: "status",
								icon: <FaSolidSatelliteDish />,
							},
							{
								label: T()("updated_at"),
								key: "updated_at",
								icon: <FaSolidCalendar />,
							},
						]}
						state={{
							isLoading: documents.isLoading,
							isSuccess: documents.isSuccess,
						}}
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
										}}
										callbacks={{
											setSelected: setSelected,
											onClick: () => {
												documentSelectStore.get.onSelectCallback(doc());
												documentSelectStore.set("open", false);
											},
										}}
										current={doc().id === documentSelectStore.get.selected}
									/>
								)}
							</Index>
						)}
					</Table>
				</DynamicContent>
			</div>
		</div>
	);
};

export default DocumentSelectModal;
