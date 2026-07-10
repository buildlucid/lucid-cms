import type {
	Collection,
	DocumentRef,
	InternalCollectionDocument,
	RelationFieldValue,
} from "@types";
import {
	FaSolidBarsProgress,
	FaSolidCalendar,
	FaSolidUser,
	FaSolidUserCheck,
} from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { Select } from "@/components/Groups/Form";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import {
	FilterSection,
	FilterSectionToggle,
} from "@/components/Groups/Query/FilterSection";
import { PerPage } from "@/components/Groups/Query/PerPage";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import DocumentRow from "@/components/Tables/Rows/DocumentRow";
import useQueryState, { pagination, sort } from "@/hooks/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import {
	buildDocumentFilterSchema,
	documentFilterSectionFields,
} from "@/utils/document-filter-fields";
import {
	collectionFieldIncludes,
	collectionFieldSorts,
	documentListingRefIncludes,
	tableHeadColumns,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { documentResponseToRef } from "@/utils/relation-field-helpers";

interface DocumentSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		collectionKeys: string[] | undefined;
		multiple?: boolean;
		selected?: RelationFieldValue[];
		selectedRefs?: DocumentRef[];
	};
	callbacks: {
		onSelect: (selection: {
			value: RelationFieldValue[];
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
				title: T()("documents.select.title"),
				description: T()("documents.select.description"),
			}}
		>
			{() => (
				<DocumentSelectContent
					collectionKeys={props.state.collectionKeys}
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
	collectionKeys: string[] | undefined;
	multiple?: boolean;
	selected?: RelationFieldValue[];
	selectedRefs?: DocumentRef[];
	onClose: () => void;
	onSelect: (selection: {
		value: RelationFieldValue[];
		refs: DocumentRef[];
	}) => void;
}

const DocumentSelectContent: Component<DocumentSelectContentProps> = (
	props,
) => {
	const [selectedDocuments, setSelectedDocuments] = createSignal<DocumentRef[]>(
		[],
	);
	const [activeCollectionKey, setActiveCollectionKey] = createSignal<string>();
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);
	//* collection key the filter schema was last built for - documents only
	//* query once this matches, so stale filters never hit a new collection
	const [filterSchemaCollectionKey, setFilterSchemaCollectionKey] =
		createSignal<string>();
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {},
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		options: {
			singleSort: true,
		},
	});

	const allowedCollectionKeys = createMemo(() => props.collectionKeys ?? []);
	const collectionKey = createMemo(() => activeCollectionKey());
	const isMultiple = createMemo(() => props.multiple === true);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const selectedDocumentValues = createMemo<RelationFieldValue[]>(() =>
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
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collection.data?.data),
	);
	const getListingRefIncludes = createMemo(() =>
		documentListingRefIncludes(getCollectionFieldIncludes()),
	);
	const collections = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () =>
			allowedCollectionKeys().length > 1 ||
			getCollectionFieldIncludes().some((field) => field.type === "relation"),
	});
	const documents = api.documents.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			location: {
				collectionKey: collectionKey,
				versionType: "latest",
			},
			filters: {
				isDeleted: 0,
			},
			include: {
				"refs.media": () => getListingRefIncludes()["refs.media"],
				"refs.relation": () => getListingRefIncludes()["refs.relation"],
				"refs.user": () => getListingRefIncludes()["refs.user"],
			},
		},
		enabled: () =>
			searchParams.ready() &&
			collection.isSuccess &&
			filterSchemaCollectionKey() === collectionKey(),
	});
	const getFilterFields = createMemo(() =>
		documentFilterSectionFields(collection.data?.data),
	);
	const relationCollectionData = createMemo(() => {
		const map = new Map(
			(collections.data?.data ?? []).map((collection) => [
				collection.key,
				collection,
			]),
		);
		const activeCollection = collection.data?.data;
		if (activeCollection) map.set(activeCollection.key, activeCollection);
		return Array.from(map.values());
	});
	const relationCollectionsByKey = createMemo(
		() =>
			new Map(
				relationCollectionData().map((collection) => [
					collection.key,
					collection,
				]),
			),
	);
	const getTableHeadColumns = createMemo(() =>
		tableHeadColumns(getCollectionFieldIncludes()),
	);
	const workflowHeadColumn = createMemo(() =>
		collection.data?.data.workflow
			? [
					{
						label: T()("documents.workflow.stage"),
						key: "workflowStage",
						icon: <FaSolidBarsProgress />,
					},
					{
						label: T()("documents.workflow.assigned.to"),
						key: "workflowAssignee",
						icon: <FaSolidUserCheck />,
						minWidth: 200,
					},
				]
			: [],
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
			}) || T()("common.collection"),
	);
	const isSuccess = createMemo(
		() => documents.isSuccess || collection.isSuccess,
	);
	const isError = createMemo(() => documents.isError || collection.isError);
	const collectionOptions = createMemo(() =>
		allowedCollectionKeys().map((collectionKey) => {
			const collection = collections.data?.data.find(
				(collection) => collection.key === collectionKey,
			);
			return {
				value: collectionKey,
				label:
					helpers.getLocaleValue({
						value: collection?.details.name,
						fallback: collectionKey,
					}) || collectionKey,
			};
		}),
	);
	const documentSortOptions = createMemo(() => [
		...collectionFieldSorts(collection.data?.data),
		...(collection.data?.data.orderable === true
			? [
					{
						label: T()("documents.order.sort.label"),
						key: "order",
					},
				]
			: []),
		{
			label: T()("common.updated.at"),
			key: "updatedAt",
		},
		{
			label: T()("common.created.at"),
			key: "createdAt",
		},
	]);

	createEffect(() => {
		const allowed = allowedCollectionKeys();
		const active = activeCollectionKey();

		if (allowed.length === 0) {
			setActiveCollectionKey(undefined);
			return;
		}

		if (!active || !allowed.includes(active)) {
			setActiveCollectionKey(allowed[0]);
		}
	});
	createEffect(() => {
		const active = collectionKey();
		//* wait for the active collection's own config - a cached previous
		//* collection would build the wrong filter schema
		if (
			collection.isSuccess &&
			active &&
			collection.data?.data.key === active &&
			filterSchemaCollectionKey() !== active
		) {
			searchParams.setSchema({
				filters: buildDocumentFilterSchema(getFilterFields()),
			});
			searchParams.resetFilters();
			searchParams.setParams({
				sorts: {
					updatedAt: "desc",
				},
				pagination: {
					page: 1,
					perPage: searchParams.pagination().perPage,
				},
			});
			setFilterSectionOpen(false);
			//* opens the documents query gate last - filters are clean by now
			setFilterSchemaCollectionKey(active);
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
					<FilterSectionToggle
						open={filterSectionOpen()}
						onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
						searchParams={searchParams}
						disabled={getFilterFields().length === 0}
					/>
					<Sort sorts={documentSortOptions()} searchParams={searchParams} />
					<Show when={allowedCollectionKeys().length > 1}>
						<div class="w-56 max-w-full">
							<Select
								id="document-select-collection"
								name="document-select-collection"
								value={collectionKey()}
								onChange={(value) => {
									if (typeof value === "string") {
										setActiveCollectionKey(value);
									}
								}}
								options={collectionOptions()}
								noMargin={true}
								noClear={true}
								small={true}
							/>
						</div>
					</Show>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<FilterSection
				open={filterSectionOpen()}
				setOpen={setFilterSectionOpen}
				subject={collectionName()}
				preserveSubjectCase={true}
				fields={getFilterFields()}
				searchParams={searchParams}
				embedded={true}
			/>

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
						title: T()("empty.states.documents.title", {
							collectionMultiple: collectionName(),
						}),
						description: T()("empty.states.documents.select.description", {
							collectionMultiple: collectionName().toLowerCase(),
							collectionSingle: collectionSingularName().toLowerCase(),
						}),
						button: T()("actions.create.document", {
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
						...workflowHeadColumn(),
						{
							label: T()("common.created.by"),
							key: "createdBy",
							icon: <FaSolidUser />,
							minWidth: 180,
						},
						{
							label: T()("common.updated.by"),
							key: "updatedBy",
							icon: <FaSolidUser />,
							minWidth: 180,
						},
						{
							label: T()("common.updated.at"),
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
									collectionsByKey={relationCollectionsByKey()}
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
