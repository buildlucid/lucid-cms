import { useNavigate, useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { FaSolidArrowDownWideShort } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
	Show,
} from "solid-js";
import Alert from "@/components/Alert/Alert";
import Button from "@/components/Button/Button";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import { DocumentsList } from "@/components/DocumentsList/DocumentsList";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import { createDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import useQueryState, { sort } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	buildDocumentFilterSchema,
	documentFilterPanelFields,
} from "@/utils/document-filter-fields";
import {
	collectionFieldIncludes,
	collectionFieldSorts,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

const DocumentsPage: Component = () => {
	let filterSchemaKey: string | undefined;

	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const params = useParams();
	const navigate = useNavigate();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
			},
		},
		awaitSchema: true,
		singleSort: true,
	});
	const [showingDeleted, setShowingDeleted] = createSignal(false);
	const [orderMode, setOrderMode] = createSignal(false);
	const [filterSectionOpen, setFilterPanelOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);

	// ----------------------------------
	// Functions
	//* order mode pins drag positions to ascending manual order
	const enterOrderMode = () => {
		setOrderMode(true);
		searchParams.setParams({
			sorts: {
				order: "asc",
			},
		});
	};
	const exitOrderMode = () => {
		setOrderMode(false);
		searchParams.setParams({
			sorts: {
				updatedAt: "desc",
			},
		});
	};

	// ----------------------------------
	// Queries
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		refetchOnWindowFocus: false,
		enabled: () => !!collectionKey(),
	});
	const collectionData = createMemo(() => collection.data?.data);
	const documentLocalization = createDocumentLocalization(collectionData);

	// ----------------------------------
	// Memos
	const collectionIsSuccess = createMemo(() => collection.isSuccess);
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collectionData()),
	);
	const getFilterFields = createMemo(() =>
		documentFilterPanelFields(collectionData()),
	);
	const getCollectionFieldSorts = createMemo(() =>
		collectionFieldSorts(collectionData()),
	);
	const relationCollectionLookupEnabled = createMemo(() =>
		getCollectionFieldIncludes().some((field) => field.type === "relation"),
	);
	const relationCollections = api.collections.useGetAll({
		queryParams: {
			include: {
				fields: true,
			},
		},
		enabled: () => relationCollectionLookupEnabled(),
	});
	const relationCollectionData = createMemo(() => {
		const map = new Map(
			(relationCollections.data?.data ?? []).map((collection) => [
				collection.key,
				collection,
			]),
		);
		const activeCollection = collectionData();
		if (activeCollection) map.set(activeCollection.key, activeCollection);
		return Array.from(map.values());
	});
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: collectionData()?.details.labels.plural,
		}),
	);
	const collectionSingularName = createMemo(() =>
		helpers.getLocaleValue({
			value: collectionData()?.details.labels.singular,
		}),
	);
	const collectionSummary = createMemo(() => {
		const fallback = T()("builder.header.summary.fallback", {
			collectionSingle: collectionSingularName(),
		});
		const summary = helpers.getLocaleValue({
			value: collectionData()?.details.description,
			fallback,
		});

		return summary.trim() || fallback;
	});
	const canReorderDocuments = createMemo(
		() =>
			collectionData()?.orderable === true &&
			userStore.get.hasPermission([collectionData()?.permissions.update]).some,
	);

	// ----------------------------------
	// Effects
	//* reset order mode and the filter section when switching collections -
	//* closing the section also clears its uncommitted draft rows
	createEffect(
		on(
			collectionKey,
			() => {
				setOrderMode(false);
				setFilterPanelOpen(false);
			},
			{ defer: true },
		),
	);
	createEffect(() => {
		if (!collectionData()) return;
		if (
			contentLocaleStore.get.contentLocale ===
			documentLocalization.contentLocale()
		) {
			return;
		}
		contentLocaleStore.get.setContentLocale(
			documentLocalization.contentLocale(),
		);
	});
	createEffect(() => {
		const activeCollection = collectionData();
		if (collectionIsSuccess() && activeCollection) {
			if (activeCollection.mode === "single") {
				navigate(
					activeCollection.documentId
						? getDocumentRoute("edit", {
								collectionKey: activeCollection.key,
								documentId: activeCollection.documentId,
							})
						: getDocumentRoute("create", {
								collectionKey: activeCollection.key,
							}),
					{
						replace: true,
					},
				);
			}
		}
	});
	createEffect(() => {
		const activeCollectionKey = collectionKey();
		const activeCollection = collectionData();
		if (!collectionIsSuccess() || !activeCollection || !activeCollectionKey) {
			return;
		}

		const filterFields = getFilterFields();
		const nextFilterSchemaKey = JSON.stringify({
			collectionKey: activeCollectionKey,
			fields: filterFields.map((field) => ({
				key: field.key,
				type: field.type,
			})),
			workflow: activeCollection.publishing.workflow !== undefined,
		});
		if (filterSchemaKey === nextFilterSchemaKey) return;
		filterSchemaKey = nextFilterSchemaKey;

		searchParams.setSchema({
			filters: buildDocumentFilterSchema(filterFields),
		});
	});

	// ----------------------------------
	// Memos
	const contentLocales = createMemo(() =>
		collectionData()?.localized ? documentLocalization.locales() : undefined,
	);
	const createActions = createMemo<CreateMenuAction[]>(() => {
		const canCreate = userStore.get.hasPermission([
			collectionData()?.permissions.create,
		]).some;
		if (!canCreate || collectionData()?.locked === true) return [];

		return [
			{
				type: "link",
				label: T()("actions.create.dynamic", {
					name: collectionSingularName() || "",
				}),
				href: getDocumentRoute("create", {
					collectionKey: collectionKey() || "",
				}),
			},
		];
	});

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<Show when={collectionData()?.locked === true}>
				<Alert variant="warning" appearance="bar">
					{T()("collections.locked.message")}
				</Alert>
			</Show>
			<PageLayout.Header
				title={collectionName()}
				description={collectionSummary()}
				actions={
					<>
						<Show when={(contentLocales()?.length ?? 0) > 1}>
							<div class="w-full md:max-w-42">
								<ContentLocaleSelect
									locales={contentLocales()}
									showShortcut={true}
								/>
							</div>
						</Show>
						<CreateMenu actions={createActions()} />
					</>
				}
			>
				<QueryToolbar
					queryState={searchParams}
					showingDeleted={orderMode() ? undefined : showingDeleted()}
					onShowingDeletedChange={
						orderMode()
							? undefined
							: (value: boolean) => {
									setShowingDeleted(value);
								}
					}
					onResetFilters={() => {
						searchParams.resetFilters();
						setFilterPanelOpen(false);
					}}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.documents.all(),
						});
					}}
					filtersOpen={filterSectionOpen()}
					onFiltersOpenChange={setFilterPanelOpen}
					filterSubject={collectionName()}
					preserveFilterSubjectCase
					filterFields={orderMode() ? undefined : getFilterFields()}
					sorts={
						orderMode()
							? undefined
							: [
									...getCollectionFieldSorts(),
									...(collectionData()?.orderable === true
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
								]
					}
					perPage
				>
					<Show when={canReorderDocuments() && !showingDeleted()}>
						<Button
							variant={orderMode() ? "primary" : "outline"}
							size="sm"
							type="button"
							class="gap-2"
							onClick={() => {
								if (orderMode()) {
									exitOrderMode();
								} else {
									enterOrderMode();
								}
							}}
						>
							<FaSolidArrowDownWideShort size={14} />
							<span>
								{orderMode()
									? T()("documents.order.mode.exit")
									: T()("documents.order.mode.action")}
							</span>
						</Button>
					</Show>
				</QueryToolbar>
			</PageLayout.Header>
			<PageLayout.Body>
				<DocumentsList
					state={{
						collection: collectionData(),
						listing: getCollectionFieldIncludes,
						relationCollections: relationCollectionData,
						searchParams: searchParams,
						isLoading: collection.isFetching,
						collectionIsSuccess: collectionIsSuccess,
						showingDeleted: showingDeleted,
						orderMode: orderMode,
					}}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default DocumentsPage;
