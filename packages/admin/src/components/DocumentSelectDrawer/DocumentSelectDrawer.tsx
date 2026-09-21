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
	type JSXElement,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DocumentSelectSingle from "@/components/DocumentSelectSingle/DocumentSelectSingle";
import DocumentTableRow from "@/components/DocumentTableRow/DocumentTableRow";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import { FilterSection } from "@/components/FilterSection/FilterSection";
import { FilterSectionToggle } from "@/components/FilterSectionToggle/FilterSectionToggle";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import { PerPageSelect } from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { QuerySort } from "@/components/QuerySort/QuerySort";
import { ResetFilters } from "@/components/ResetFilters/ResetFilters";
import Select from "@/components/Select/Select";
import { Table } from "@/components/Table/Table";
import { usePageBuilderState } from "@/hooks/usePageBuilderState/usePageBuilderState";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
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
const DocumentSelectDrawer: Component<DocumentSelectPanelProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
			zIndex={props.state.zIndex}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("documents.select.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("documents.select.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Body>
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
			</Drawer.Body>
		</Drawer.Root>
	);
};

interface DocumentSelectContentProps {
	collectionKeys: string[] | undefined;
	multiple?: boolean;
	selected?: RelationFieldValue[];
	selectedRefs?: DocumentRef[];
	excludeDocument?: RelationFieldValue;
	topbarSlot?: JSXElement;
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
	const pageBuilderState = usePageBuilderState();
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
		singleSort: true,
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
	const pageBuilderCollections = createMemo(() =>
		pageBuilderState.documentState?.collections?.(),
	);

	// ----------------------------------------
	// Queries
	const collectionQuery = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => pageBuilderCollections() === undefined && !!collectionKey(),
	});

	// ----------------------------------------
	// Memos
	const activeCollection = createMemo(() => {
		const activeKey = collectionKey();
		return (
			pageBuilderCollections()?.find(
				(collection) => collection.key === activeKey,
			) ?? collectionQuery.data?.data
		);
	});
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(activeCollection()),
	);
	const getListingRefIncludes = createMemo(() =>
		documentListingRefIncludes(getCollectionFieldIncludes()),
	);

	// ----------------------------------------
	// Queries
	const collectionsQuery = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () =>
			pageBuilderCollections() === undefined &&
			(allowedCollectionKeys().length > 1 ||
				getCollectionFieldIncludes().some(
					(field) => field.type === "relation",
				)),
	});
	const collections = createMemo(
		() => pageBuilderCollections() ?? collectionsQuery.data?.data ?? [],
	);
	const collectionIsLoading = createMemo(() =>
		pageBuilderCollections() === undefined
			? collectionQuery.isLoading
			: pageBuilderState.documentState?.collectionsQuery.isLoading === true,
	);
	const collectionIsError = createMemo(() =>
		pageBuilderCollections() === undefined
			? collectionQuery.isError
			: pageBuilderState.documentState?.collectionsQuery.isError === true,
	);
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
				"refs.documents": () => getListingRefIncludes()["refs.documents"],
				"refs.users": () => getListingRefIncludes()["refs.users"],
			},
		},
		enabled: () =>
			searchParams.ready() &&
			activeCollection() !== undefined &&
			activeCollection()?.mode !== "single" &&
			filterSchemaContextKey() === filterSchemaContext(),
	});
	const singleDocument = api.documents.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: () => activeCollection()?.documentId ?? undefined,
				version: "latest",
			},
			//* single-document consumers (including variables) need the full field
			//* payload; the endpoint only loads fields when refs or bricks are included
			include: { refs: true },
		},
		enabled: () =>
			activeCollection()?.mode === "single" &&
			typeof activeCollection()?.documentId === "number",
	});
	// ----------------------------------------
	// Memos
	const getFilterFields = createMemo(() =>
		documentFilterSectionFields(activeCollection()),
	);
	const relationCollectionData = createMemo(() => {
		const map = new Map(
			collections().map((collection) => [collection.key, collection]),
		);
		const active = activeCollection();
		if (active) map.set(active.key, active);
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
		activeCollection()?.publishing.workflow
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
			value: activeCollection()?.details.labels.plural,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: activeCollection()?.details.labels.singular,
			}) || T()("common.collection"),
	);
	const isSingleCollection = createMemo(
		() => activeCollection()?.mode === "single",
	);
	const singleDocumentExcluded = createMemo(
		() =>
			isSingleCollection() &&
			typeof activeCollection()?.documentId === "number" &&
			activeCollection()?.documentId === excludedDocumentId(),
	);
	const singleDocumentSelected = createMemo(() => {
		const document = singleDocument.data?.data;
		if (!document) return false;

		return selectedDocuments().some(
			(selectedDocument) =>
				selectedDocument.id === document.id &&
				selectedDocument.collectionKey === document.collectionKey,
		);
	});
	const collectionOptions = createMemo(() =>
		allowedCollectionKeys().map((collectionKey) => {
			const collection = collections().find(
				(collection) => collection.key === collectionKey,
			);
			return {
				value: collectionKey,
				label:
					helpers.getLocaleValue({
						value: collection?.details.labels.plural,
						fallback: collectionKey,
					}) || collectionKey,
			};
		}),
	);
	const documentSortOptions = createMemo(() => [
		...collectionFieldSorts(activeCollection()),
		...(activeCollection()?.orderable === true
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
			active &&
			activeCollection()?.key === active &&
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
					<FilterSectionToggle
						open={!isSingleCollection() && filterSectionOpen()}
						onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
						searchParams={searchParams}
						active={!isSingleCollection() && searchParams.hasFiltersApplied()}
						disabled={isSingleCollection() || getFilterFields().length === 0}
					/>
					<QuerySort
						sorts={documentSortOptions()}
						searchParams={searchParams}
						disabled={isSingleCollection()}
					/>
					{props.topbarSlot}
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
								size="sm"
							/>
						</div>
					</Show>
					<Show
						when={!isSingleCollection() && searchParams.hasFiltersApplied()}
					>
						<ResetFilters onReset={searchParams.clearFilters} />
					</Show>
				</div>
				<PerPageSelect
					options={[10, 20, 40]}
					searchParams={searchParams}
					disabled={isSingleCollection()}
				/>
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
				when={isSingleCollection() && activeCollection()}
				fallback={
					<>
						<QueryBoundary
							isLoading={collectionIsLoading()}
							isError={documents.isError || collectionIsError()}
							isEmpty={documents.data?.data.length === 0}
							queryState={searchParams}
							onResetFilters={searchParams.clearFilters}
							empty={
								<EmptyState
									title={T()("empty.states.documents.title", {
										collectionMultiple: collectionName(),
									})}
									description={T()(
										"empty.states.documents.select.description",
										{
											collectionMultiple: collectionName().toLowerCase(),
											collectionSingle: collectionSingularName().toLowerCase(),
										},
									)}
								/>
							}
							class={
								"flex-1 h-full bg-card-base border border-border rounded-md"
							}
						>
							<Table
								key={`documents.list.${activeCollection()?.key ?? ""}`}
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
											<DocumentTableRow
												index={i}
												document={doc()}
												refs={documents.data?.refs}
												fieldInclude={getCollectionFieldIncludes()}
												collection={activeCollection() as Collection}
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
						</QueryBoundary>
						<PaginatedFooter
							state={{
								searchParams: searchParams,
								meta: documents.data?.meta,
							}}
							options={{
								embedded: true,
							}}
						/>
					</>
				}
			>
				{(activeCollection) => (
					<DocumentSelectSingle
						collection={activeCollection()}
						document={singleDocument.data?.data}
						contentLocale={contentLocale()}
						isLoading={
							collectionIsLoading() ||
							(typeof activeCollection().documentId === "number" &&
								singleDocument.isLoading)
						}
						isError={collectionIsError() || singleDocument.isError}
						isExcluded={singleDocumentExcluded()}
						selected={singleDocumentSelected()}
						onSelect={() => {
							const document = singleDocument.data?.data;
							if (document) toggleSelectedDocument(document);
						}}
					/>
				)}
			</Show>
			<Drawer.Footer class="-mx-4 md:-mx-6">
				<div class="flex flex-wrap items-center gap-3">
					<p class="text-sm text-subtitle">
						{selectedDocuments().length} {T()("common.selected").toLowerCase()}
					</p>
				</div>
				<Drawer.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						onClick={props.onClose}
					>
						{T()("common.close")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={confirmSelection}
					>
						{T()("common.confirm")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</div>
	);
};

export default DocumentSelectDrawer;
