import { useQueryClient } from "@tanstack/solid-query";
import type {
	PublishOperationExecutionStatus,
	PublishOperationOverview,
	PublishOperationStatus,
} from "@types";
import { type Component, createEffect, createMemo } from "solid-js";
import { ReleaseRequestsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import type { FilterSectionPresets } from "@/components/Groups/Query/FilterSection";
import { QueryRow } from "@/components/Groups/Query/Row";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

const ReleaseRequestsListRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				collectionKey: textFilter(),
				documentId: numberFilter(),
				target: textFilter(),
				status: textFilter(),
				executionStatus: textFilter(),
				requestedBy: numberFilter(),
				reviewers: numberFilter(),
				assignedToMe: booleanFilter(),
				requestedByMe: booleanFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
				scheduledAt: textFilter(),
				executedAt: textFilter(),
				failedAt: textFilter(),
			},
			sorts: {
				createdAt: sort({ defaultValue: "desc" }),
				scheduledAt: sort(),
				updatedAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		options: {
			singleSort: true,
		},
	});

	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
	});
	const overview = api.publishOperations.useGetOverview({
		queryParams: {
			filters: {
				collectionKey: () => {
					const value = searchParams.filters().get("collectionKey");
					return typeof value === "string" && value.length > 0
						? value
						: undefined;
				},
				target: () => {
					const value = searchParams.filters().get("target");
					return typeof value === "string" && value.length > 0
						? value
						: undefined;
				},
			},
		},
		enabled: () => searchParams.ready(),
	});
	// ----------------------------------
	// Memos
	const reviewCollectionKeys = createMemo(
		() =>
			new Set(
				(collections.data?.data ?? [])
					.filter(
						(collection) => (collection.review?.requiredFor?.length ?? 0) > 0,
					)
					.map((collection) => collection.key),
			),
	);
	const collectionOptions = createMemo(() =>
		(collections.data?.data ?? [])
			.filter((collection) => reviewCollectionKeys().has(collection.key))
			.map((collection) => ({
				value: collection.key,
				label:
					helpers.getLocaleValue({ value: collection.details.name }) ||
					collection.key,
			})),
	);
	const collectionLabels = createMemo(
		() =>
			new Map(
				(collections.data?.data ?? []).map((collection) => [
					collection.key,
					helpers.getLocaleValue({
						value: collection.details.singularName,
						fallback: collection.key,
					}) || collection.key,
				]),
			),
	);
	const documentFilterCollections = createMemo(() => {
		const selected = searchParams.filters().get("collectionKey");
		if (typeof selected === "string" && selected) return [selected];
		return Array.from(reviewCollectionKeys());
	});
	const targetOptions = createMemo(() => {
		const keys = new Set<string>();
		const selectedCollectionKey = searchParams.filters().get("collectionKey");
		for (const collection of collections.data?.data ?? []) {
			if (
				typeof selectedCollectionKey === "string" &&
				selectedCollectionKey &&
				collection.key !== selectedCollectionKey
			) {
				continue;
			}
			for (const target of collection.review?.requiredFor ?? [])
				keys.add(target);
		}
		return Array.from(keys).map((key) => ({
			value: key,
			label: key,
		}));
	});
	const releaseRequestPresets = createMemo<FilterSectionPresets>(() => {
		const data: PublishOperationOverview | undefined = overview.data?.data;
		const loading = overview.isFetching;
		const items: FilterSectionPresets["items"] = [
			{
				key: "pending",
				label: T()("common.pending.review"),
				value: data?.pending,
				loading,
				filters: {
					status: {
						value: "pending" satisfies PublishOperationStatus,
						operator: "=",
					},
				},
			},
			{
				key: "assigned",
				label: T()("common.assigned.to.me"),
				value: data?.assignedToMe,
				loading,
				filters: { assignedToMe: { value: true, operator: "=" } },
			},
			{
				key: "approved",
				label: T()("common.status.approved"),
				value: data?.approved,
				loading,
				filters: {
					status: {
						value: "approved" satisfies PublishOperationStatus,
						operator: "=",
					},
				},
			},
			{
				key: "rejected",
				label: T()("common.status.rejected"),
				value: data?.rejected,
				loading,
				filters: {
					status: {
						value: "rejected" satisfies PublishOperationStatus,
						operator: "=",
					},
				},
			},
		];

		return {
			items,
		};
	});
	// ----------------------------------
	// Effects
	createEffect(() => {
		const selectedTarget = searchParams.filters().get("target");
		if (typeof selectedTarget !== "string" || selectedTarget === "") return;
		if (targetOptions().some((option) => option.value === selectedTarget))
			return;

		searchParams.setParams({
			filters: {
				target: undefined,
			},
		});
	});

	// ----------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("routes.publish.requests.title"),
							description: T()("routes.publish.requests.description"),
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									onRefresh={() => {
										queryClient.invalidateQueries({
											queryKey: ["publishOperations.getMultiple"],
										});
										queryClient.invalidateQueries({
											queryKey: ["publishOperations.getOverview"],
										});
									}}
									filterSection={{
										subject: T()("routes.publish.requests.title"),
										presets: releaseRequestPresets(),
										fields: [
											{
												label: T()("common.collection"),
												key: "collectionKey",
												type: "select",
												options: collectionOptions(),
											},
											{
												label: T()("common.target"),
												key: "target",
												type: "select",
												options: targetOptions(),
											},
											{
												label: T()("common.document"),
												key: "documentId",
												type: "relation",
												collections: documentFilterCollections(),
												relationValue: "id",
											},
											{
												label: T()("common.status"),
												key: "status",
												type: "select",
												options: [
													{
														label: T()("common.status.pending"),
														value: "pending" satisfies PublishOperationStatus,
													},
													{
														label: T()("common.status.approved"),
														value: "approved" satisfies PublishOperationStatus,
													},
													{
														label: T()("common.status.rejected"),
														value: "rejected" satisfies PublishOperationStatus,
													},
													{
														label: T()("common.status.cancelled"),
														value: "cancelled" satisfies PublishOperationStatus,
													},
													{
														label: T()("common.status.superseded"),
														value:
															"superseded" satisfies PublishOperationStatus,
													},
												],
											},
											{
												label: T()("common.execution.status"),
												key: "executionStatus",
												type: "select",
												options: [
													{
														label: T()("common.status.awaiting.approval"),
														value:
															"awaiting_approval" satisfies PublishOperationExecutionStatus,
													},
													{
														label: T()("common.status.scheduled"),
														value:
															"scheduled" satisfies PublishOperationExecutionStatus,
													},
													{
														label: T()("common.status.executing"),
														value:
															"executing" satisfies PublishOperationExecutionStatus,
													},
													{
														label: T()("common.status.executed"),
														value:
															"executed" satisfies PublishOperationExecutionStatus,
													},
													{
														label: T()("common.status.failed"),
														value:
															"failed" satisfies PublishOperationExecutionStatus,
													},
													{
														label: T()("common.status.cancelled"),
														value:
															"cancelled" satisfies PublishOperationExecutionStatus,
													},
												],
											},
											{
												label: T()("common.requested.by"),
												key: "requestedBy",
												type: "user",
											},
											{
												label: T()("common.reviewers"),
												key: "reviewers",
												type: "user",
												operators: ["="],
											},
											{
												label: T()("common.assigned.to.me"),
												key: "assignedToMe",
												type: "checkbox",
											},
											{
												label: T()("common.requested.by.me"),
												key: "requestedByMe",
												type: "checkbox",
											},
											{
												label: T()("common.requested.at"),
												key: "createdAt",
												type: "datetime",
											},
											{
												label: T()("common.updated.at"),
												key: "updatedAt",
												type: "datetime",
											},
											{
												label: T()("common.scheduled.for"),
												key: "scheduledAt",
												type: "datetime",
											},
											{
												label: T()("common.executed.at"),
												key: "executedAt",
												type: "datetime",
											},
											{
												label: T()("common.failed.at"),
												key: "failedAt",
												type: "datetime",
											},
										],
									}}
									sorts={[
										{
											label: T()("common.requested.at"),
											key: "createdAt",
										},
										{
											label: T()("common.scheduled.for"),
											key: "scheduledAt",
										},
										{
											label: T()("common.updated.at"),
											key: "updatedAt",
										},
									]}
									perPage={[10, 20, 40]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<ReleaseRequestsList
				state={{
					searchParams,
				}}
				data={{
					collections: collections.data?.data ?? [],
					collectionLabels: collectionLabels(),
					reviewCollectionKeys: reviewCollectionKeys(),
				}}
				status={{
					collections: {
						isError: collections.isError,
						isSuccess: collections.isSuccess,
						isLoading: collections.isLoading,
					},
				}}
			/>
		</Wrapper>
	);
};

export default ReleaseRequestsListRoute;
