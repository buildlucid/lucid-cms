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
import { DocumentsList } from "@/components/DocumentsList/DocumentsList";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { QueryRow } from "@/components/QueryRow/QueryRow";
import { createDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import useQueryState, { sort } from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	buildDocumentFilterSchema,
	documentFilterSectionFields,
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
	const documentLocalization = createDocumentLocalization(collectionData);

	// ----------------------------------
	// Memos
	const collectionIsSuccess = createMemo(() => collection.isSuccess);
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collectionData()),
	);
	const getFilterFields = createMemo(() =>
		documentFilterSectionFields(collectionData()),
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
				setFilterSectionOpen(false);
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
	// Render
	return (
		<PageLayout
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
					<PageHeader
						copy={{
							title: collectionName(),
							description: collectionSummary(),
						}}
						actions={{
							contentLocale: collectionData()?.localized
								? documentLocalization.locales()
								: false,
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
													subject: collectionName(),
													preserveSubjectCase: true,
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
		</PageLayout>
	);
};

export default DocumentsPage;
