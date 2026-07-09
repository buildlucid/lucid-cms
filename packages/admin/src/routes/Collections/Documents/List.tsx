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
import Alert from "@/components/Blocks/Alert";
import { DocumentsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import Button from "@/components/Partials/Button";
import useQueryState, {
	arrayFilter,
	type QueryFilterSchema,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import {
	buildDocumentFilterSchema,
	documentFilterFields,
} from "@/utils/document-filter-fields";
import {
	collectionFieldIncludes,
	collectionFieldSorts,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

const CollectionsDocumentsListRoute: Component = () => {
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
		options: {
			awaitSchema: true,
			singleSort: true,
		},
	});
	const [showingDeleted, setShowingDeleted] = createSignal(false);
	const [orderMode, setOrderMode] = createSignal(false);
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);

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

	// ----------------------------------
	// Memos
	const collectionIsSuccess = createMemo(() => collection.isSuccess);
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collectionData()),
	);
	const getFilterFields = createMemo(() =>
		documentFilterFields(collectionData()),
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
			value: collectionData()?.details.name,
		}),
	);
	const collectionSingularName = createMemo(() =>
		helpers.getLocaleValue({
			value: collectionData()?.details.singularName,
		}),
	);
	const collectionSummary = createMemo(() =>
		helpers.getLocaleValue({
			value: collectionData()?.details.summary,
		}),
	);
	const canReorderDocuments = createMemo(
		() =>
			collectionData()?.orderable === true &&
			userStore.get.hasPermission([collectionData()?.permissions.update]).some,
	);

	// ----------------------------------
	// Effects
	//* reset order mode when switching collections
	createEffect(
		on(
			collectionKey,
			() => {
				setOrderMode(false);
			},
			{ defer: true },
		),
	);
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
			workflow: activeCollection.workflow !== undefined,
		});
		if (filterSchemaKey === nextFilterSchemaKey) return;
		filterSchemaKey = nextFilterSchemaKey;

		const filterConfig: QueryFilterSchema =
			buildDocumentFilterSchema(filterFields);
		//* not offered by the filter section yet, but existing URLs and API
		//* consumers still rely on these parsing
		if (activeCollection.workflow) {
			filterConfig.workflowStage = textFilter();
			filterConfig.workflowAssignee = arrayFilter();
		}
		searchParams.setSchema({ filters: filterConfig });
	});

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("collections.locked.message"),
								show: collectionData()?.locked === true,
							},
						]}
					/>
				),
				header: (
					<Standard
						copy={{
							title: collectionName(),
							description: collectionSummary(),
						}}
						actions={{
							contentLocale: collectionData()?.localized ?? false,
							createLink: {
								link: getDocumentRoute("create", {
									collectionKey: collectionKey() || "",
								}),
								permission: userStore.get.hasPermission([
									collectionData()?.permissions.create,
								]).some,
								show: collectionData()?.locked !== true,
								label: T()("actions.create.dynamic", {
									name: collectionSingularName() || "",
								}),
							},
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									showingDeleted={orderMode() ? undefined : showingDeleted}
									setShowingDeleted={
										orderMode()
											? undefined
											: (value: boolean) => {
													setShowingDeleted(value);
												}
									}
									onResetFilters={() => {
										searchParams.resetFilters();
										setFilterSectionOpen(false);
									}}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["documents.getMultiple"],
										});
									}}
									filterSection={
										orderMode()
											? undefined
											: {
													open: filterSectionOpen(),
													setOpen: setFilterSectionOpen,
													collectionName: collectionName(),
													fields: getFilterFields(),
												}
									}
									custom={
										<Show when={canReorderDocuments() && !showingDeleted()}>
											<Button
												theme="secondary-toggle"
												size="small"
												type="button"
												active={orderMode()}
												classes="gap-2"
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
									}
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
									perPage={[]}
								/>
							),
						}}
					/>
				),
			}}
		>
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
		</Wrapper>
	);
};

export default CollectionsDocumentsListRoute;
