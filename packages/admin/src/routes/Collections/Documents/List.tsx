import { useNavigate, useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import Alert from "@/components/Blocks/Alert";
import { DocumentsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useSearchParamsLocation, {
	type FilterSchema,
} from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import {
	collectionFieldFilters,
	collectionFieldIncludes,
	formatFieldFilters,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

const CollectionsDocumentsListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const params = useParams();
	const navigate = useNavigate();
	const searchParams = useSearchParamsLocation(
		{
			sorts: {
				updatedAt: "desc",
				createdAt: undefined,
			},
		},
		{
			manualSettled: true,
			singleSort: true,
		},
	);
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
	const workflowAssignees = api.documents.useGetWorkflowAssignees({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () =>
			Boolean(collectionKey() && collection.data?.data.config.workflow),
	});
	const users = api.users.useGetMultiple({
		queryParams: {
			filters: {
				isDeleted: 0,
			},
			perPage: -1,
		},
	});

	// ----------------------------------
	// Memos
	const getCollectionFieldIncludes = createMemo(() =>
		collectionFieldIncludes(collection.data?.data),
	);
	const getCollectionFieldFilters = createMemo(() =>
		collectionFieldFilters(collection.data?.data),
	);
	const getWorkflowFilters = createMemo(() => {
		const workflow = collection.data?.data.config.workflow;
		if (!workflow) return [];

		return [
			{
				label: T()("documents.workflow.stage"),
				key: "workflowStage",
				type: "select" as const,
				options: workflow.stages.map((stage) => ({
					value: stage.key,
					label:
						helpers.getLocaleValue({
							value: stage.name,
							fallback: stage.key,
						}) || stage.key,
				})),
			},
			{
				label: T()("documents.workflow.assigned.to"),
				key: "workflowAssignee",
				type: "multi-select" as const,
				options:
					workflowAssignees.data?.data.map((user) => ({
						value: user.id,
						label: helpers.formatUserName(
							{
								username:
									user.username ?? user.email ?? T()("media.types.unknown"),
								firstName: user.firstName,
								lastName: user.lastName,
							},
							"simple",
						),
						user,
					})) ?? [],
				optionType: "user" as const,
			},
		];
	});
	const userOptions = createMemo(() =>
		(users.data?.data ?? []).map((user) => ({
			value: user.id,
			label:
				helpers.formatUserName(user, "simple") || T()("media.types.unknown"),
			user,
		})),
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
				navigate(
					collection.data.data.documentId
						? getDocumentRoute("edit", {
								collectionKey: collection.data.data.key,
								documentId: collection.data.data.documentId,
							})
						: getDocumentRoute("create", {
								collectionKey: collection.data.data.key,
							}),
					{
						replace: true,
					},
				);
			}
		}
	});
	createEffect(() => {
		if (collection.isSuccess) {
			const filterConfig: FilterSchema = {};
			for (const field of getCollectionFieldFilters()) {
				switch (field.type) {
					case "user": {
						filterConfig[
							formatFieldFilters({
								fieldKey: field.key,
							})
						] = {
							type: "array",
							value: [],
						};
						break;
					}
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
			if (collection.data.data.config.workflow) {
				filterConfig.workflowStage = {
					type: "text",
					value: "",
				};
				filterConfig.workflowAssignee = {
					type: "array",
					value: [],
				};
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
								message: T()("collections.locked.message"),
								show: collection.data?.data.config.locked === true,
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
							contentLocale: collection.data?.data.config.localized ?? false,
							createLink: {
								link: getDocumentRoute("create", {
									collectionKey: collectionKey() || "",
								}),
								permission: userStore.get.hasPermission([
									collection.data?.data.permissions.create,
								]).some,
								show: collection.data?.data.config.locked !== true,
								label: T()("actions.create.dynamic", {
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
									filters={[
										...getCollectionFieldFilters().map((field) => {
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
														type: "boolean" as const,
													};
												}
												case "select": {
													return {
														label: helpers.getLocaleValue({
															value: field.details.label,
															fallback: field.key,
														}),
														key: fieldKey,
														type: "select" as const,
														options: field.options?.map((option, i) => ({
															value: option.value,
															label: helpers.getLocaleValue({
																value: option.label,
																fallback: T()("fields.options.label", {
																	count: i,
																}),
															}),
														})),
													};
												}
												case "user": {
													return {
														label: helpers.getLocaleValue({
															value: field.details.label,
															fallback: field.key,
														}),
														key: fieldKey,
														type: "multi-select" as const,
														options: userOptions(),
														optionType: "user" as const,
													};
												}
												default: {
													return {
														label: helpers.getLocaleValue({
															value: field.details.label,
															fallback: field.key,
														}),
														key: fieldKey,
														type: "text" as const,
													};
												}
											}
										}),
										...getWorkflowFilters(),
									]}
									sorts={[
										{
											label: T()("common.updated.at"),
											key: "updatedAt",
										},
										{
											label: T()("common.created.at"),
											key: "createdAt",
										},
									]}
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
