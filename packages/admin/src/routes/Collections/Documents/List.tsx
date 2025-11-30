import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createEffect,
	createSignal,
} from "solid-js";
import api from "@/services/api";
import userStore from "@/store/userStore";
import helpers from "@/utils/helpers";
import useSearchParamsLocation, {
	type FilterSchema,
} from "@/hooks/useSearchParamsLocation";
import { QueryRow } from "@/components/Groups/Query";
import { getDocumentRoute } from "@/utils/route-helpers";
import {
	collectionFieldFilters,
	collectionFieldIncludes,
	formatFieldFilters,
} from "@/utils/document-table-helpers";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { DocumentsList } from "@/components/Groups/Content";
import Alert from "@/components/Blocks/Alert";
import { useQueryClient } from "@tanstack/solid-query";

const CollectionsDocumentsListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const params = useParams();
	const navigate = useNavigate();
	const searchParams = useSearchParamsLocation(undefined, {
		manualSettled: true,
	});
	const [showingDeleted, setShowingDeleted] = createSignal(false);

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);

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

	// ----------------------------------
	// Memos
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collection.data?.data),
	);
	const getCollectionFieldFilters = createMemo(() =>
		collectionFieldFilters(collection.data?.data),
	);
	const collectionIsSuccess = createMemo(() => collection.isSuccess);
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: collection.data?.data.details.name,
		}),
	);
	const collectionSingularName = createMemo(() =>
		helpers.getLocaleValue({
			value: collection.data?.data.details.singularName,
		}),
	);
	const collectionSummary = createMemo(() =>
		helpers.getLocaleValue({
			value: collection.data?.data.details.summary,
		}),
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (collection.isSuccess) {
			if (collection.data.data.mode === "single") {
				navigate("/admin/collections");
			}
		}
	});
	createEffect(() => {
		if (collection.isSuccess) {
			const filterConfig: FilterSchema = {};
			for (const field of getCollectionFieldFilters()) {
				switch (field.type) {
					default: {
						filterConfig[
							formatFieldFilters({
								fieldKey: field.key,
							})
						] = {
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
		<Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("locked_collection_message"),
								show: collection.data?.data.config.isLocked === true,
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
							contentLocale:
								collection.data?.data.config.useTranslations ?? false,
							createLink: {
								link: getDocumentRoute("create", {
									collectionKey: collectionKey(),
								}),
								permission: userStore.get.hasPermission(["create_content"])
									.some,
								show: collection.data?.data.config.isLocked !== true,
								label: T()("create_dynamic", {
									name: collectionSingularName() || "",
								}),
							},
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									showingDeleted={showingDeleted}
									setShowingDeleted={setShowingDeleted}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["documents.getMultiple"],
										});
									}}
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
					collection: collection.data?.data,
					displayInListing: getCollectionFieldIncludes,
					searchParams: searchParams,
					isLoading: collection.isFetching,
					collectionIsSuccess: collectionIsSuccess,
					showingDeleted: showingDeleted,
				}}
			/>
		</Wrapper>
	);
};

export default CollectionsDocumentsListRoute;
