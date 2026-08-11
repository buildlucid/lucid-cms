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
import { ResetFilters } from "@/components/Groups/Query/ResetFilters";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import DocumentSelectSingle from "@/components/Partials/DocumentSelectSingle";
import DocumentRow from "@/components/Tables/Rows/DocumentRow";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
} from "@/hooks/useQueryState";
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
		excludeDocument?: RelationFieldValue;
		zIndex?: number;
	};
	callbacks: {
		onSelect: (selection: {
			value: RelationFieldValue[];
			refs: DocumentRef[];
		}) => void;
	};
}

/** Renders the reusable document selector in a bottom panel. */
const DocumentSelectPanel: Component<DocumentSelectPanelProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<BottomPanel
			zIndex={props.state.zIndex}
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
					excludeDocument={props.state.excludeDocument}
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
	excludeDocument?: RelationFieldValue;
	onClose: () => void;
	onSelect: (selection: {
		value: RelationFieldValue[];
		refs: DocumentRef[];
	}) => void;
}

/** Renders document selection content for panels and nested workflows. */
export const DocumentSelectContent: Component<DocumentSelectContentProps> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [selectedDocuments, setSelectedDocuments] = createSignal<DocumentRef[]>(
		[],
	);
	const [activeCollectionKey, setActiveCollectionKey] = createSignal<string>();
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);
	//* collection key the filter schema was last built for - documents only
	//* query once this matches, so stale filters never hit a new collection
	const [filterSchemaContextKey, setFilterSchemaContextKey] =
		createSignal<string>();
	let previousActiveCollectionKey: string | undefined;

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

	// ----------------------------------------
	// Memos
	const allowedCollectionKeys = createMemo(() => props.collectionKeys ?? []);
	const collectionKey = createMemo(() => activeCollectionKey());
	const excludedDocumentId = createMemo(() => {
		const excludeDocument = props.excludeDocument;
		if (
			excludeDocument === undefined ||
			excludeDocument.collectionKey !== collectionKey()
		) {
			return undefined;
		}
		return excludeDocument.id;
	});
	const filterSchemaContext = createMemo(
		() => `${collectionKey() ?? ""}:${excludedDocumentId() ?? ""}`,
	);
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

	// ----------------------------------------
	// Queries
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
	});

	// ----------------------------------------
	// Memos
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collection.data?.data),
	);
	const getListingRefIncludes = createMemo(() =>
		documentListingRefIncludes(getCollectionFieldIncludes()),
	);

	// ----------------------------------------
	// Queries
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
				"id:!=": excludedDocumentId,
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
			collection.data?.data.mode !== "single" &&
			filterSchemaContextKey() === filterSchemaContext(),
	});
	const singleDocument = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: () => collection.data?.data.documentId ?? undefined,
				version: "latest",
			},
			//* single-document consumers (including variables) need the full field
			//* payload; the endpoint only loads fields when refs or bricks are included
			include: { refs: true },
		},
		enabled: () =>
			collection.data?.data.mode === "single" &&
			typeof collection.data?.data.documentId === "number",
	});

	// ----------------------------------------
	// Memos
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
	const isSingleCollection = createMemo(
		() => collection.data?.data.mode === "single",
	);
	const singleDocumentExcluded = createMemo(
		() =>
			isSingleCollection() &&
			typeof collection.data?.data.documentId === "number" &&
			collection.data.data.documentId === excludedDocumentId(),
	);
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

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const allowed = allowedCollectionKeys();
		const active = activeCollectionKey();

		if (allowed.length === 0) {
			setActiveCollectionKey(undefined);
			return;
		}

		if (!active || !allowed.includes(active)) {
			const selectedCollectionKey =
				props.selectedRefs?.[0]?.collectionKey ??
				props.selected?.[0]?.collectionKey;

			setActiveCollectionKey(
				selectedCollectionKey && allowed.includes(selectedCollectionKey)
					? selectedCollectionKey
					: allowed[0],
			);
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
			filterSchemaContextKey() !== filterSchemaContext()
		) {
			const filterSchema = buildDocumentFilterSchema(getFilterFields());
			const excludedId = excludedDocumentId();
			if (excludedId !== undefined) {
				filterSchema.id = numberFilter({
					defaultValue: excludedId,
					defaultOperator: "!=",
				});
			}
			searchParams.setSchema({
				filters: filterSchema,
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
			setFilterSchemaContextKey(filterSchemaContext());
		}
	});
	createEffect(() => {
		setSelectedDocuments(props.selectedRefs ?? []);
	});
	createEffect(() => {
		const active = collectionKey();
		if (!active) return;

		const changed =
			previousActiveCollectionKey !== undefined &&
			previousActiveCollectionKey !== active;
		previousActiveCollectionKey = active;

		if (changed && !isMultiple()) setSelectedDocuments([]);
	});
	createEffect(() => {
		const active = collectionKey();
		const activeCollection = collection.data?.data;
		if (
			!active ||
			activeCollection?.key !== active ||
			activeCollection.mode !== "single"
		) {
			return;
		}

		if (
			singleDocumentExcluded() ||
			typeof activeCollection.documentId !== "number" ||
			singleDocument.isError
		) {
			setSelectedDocuments([]);
			return;
		}

		const document = singleDocument.data?.data;
		if (
			document?.collectionKey !== active ||
			document.id !== activeCollection.documentId
		) {
			return;
		}

		setSelectedDocuments([documentResponseToRef(document)]);
	});

	// ----------------------------------------
	// Functions
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

	// ----------------------------------------
	// Render
	return (
		<div class="flex flex-col h-full">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap items-center">
					<Show when={!isSingleCollection()}>
						<FilterSectionToggle
							open={filterSectionOpen()}
							onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
							searchParams={searchParams}
							active={searchParams.hasFiltersApplied()}
							disabled={getFilterFields().length === 0}
						/>
						<Sort sorts={documentSortOptions()} searchParams={searchParams} />
					</Show>
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
					<Show
						when={!isSingleCollection() && searchParams.hasFiltersApplied()}
					>
						<ResetFilters onReset={searchParams.clearFilters} />
					</Show>
				</div>
				<Show when={!isSingleCollection()}>
					<PerPage options={[10, 20, 40]} searchParams={searchParams} />
				</Show>
			</div>

			<Show when={!isSingleCollection()}>
				<FilterSection
					open={filterSectionOpen()}
					setOpen={setFilterSectionOpen}
					subject={collectionName()}
					preserveSubjectCase={true}
					fields={getFilterFields()}
					searchParams={searchParams}
					embedded={true}
				/>
			</Show>

			<Show
				when={isSingleCollection() && collection.data?.data}
				fallback={
					<DynamicContent
						class="bg-card-base border border-border rounded-md"
						state={{
							isError: documents.isError || collection.isError,
							isSuccess: documents.isSuccess,
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
						callback={{
							resetFilters: searchParams.clearFilters,
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
														selectedDocument.collectionKey ===
															doc().collectionKey,
												),
												onChange: () => toggleSelectedDocument(doc()),
											}}
										/>
									)}
								</Index>
							)}
						</Table>
					</DynamicContent>
				}
			>
				{(activeCollection) => (
					<DocumentSelectSingle
						collection={activeCollection()}
						document={singleDocument.data?.data}
						contentLocale={contentLocale()}
						isLoading={
							collection.isLoading ||
							(typeof activeCollection().documentId === "number" &&
								singleDocument.isLoading)
						}
						isError={collection.isError || singleDocument.isError}
						isExcluded={singleDocumentExcluded()}
					/>
				)}
			</Show>
			<PanelFooterActions
				selectedCount={selectedDocuments().length}
				onClose={props.onClose}
				onConfirm={confirmSelection}
			/>
		</div>
	);
};

export default DocumentSelectPanel;
