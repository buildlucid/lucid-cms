import { useQueryClient } from "@tanstack/solid-query";
import type {
	PublishOperationExecutionStatus,
	PublishOperationStatus,
} from "@types";
import { type Component, createEffect, createMemo } from "solid-js";
import { ReleaseRequestsList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

const ReleaseRequestsListRoute: Component = () => {
	// ----------------------------------
	// State / Hooks
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				collectionKey: {
					value: "",
					type: "text",
				},
				target: {
					value: "",
					type: "text",
				},
				status: {
					value: "",
					type: "array",
				},
				executionStatus: {
					value: "",
					type: "array",
				},
				requestedBy: {
					value: "",
					type: "array",
				},
				reviewers: {
					value: "",
					type: "array",
				},
				assignedToMe: {
					value: "",
					type: "text",
				},
				requestedByMe: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				createdAt: "desc",
				scheduledAt: undefined,
				updatedAt: undefined,
			},
			pagination: {
				perPage: 20,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Queries
	const collections = api.collections.useGetAll({
		queryParams: {},
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
	const targetOptions = createMemo(() => {
		const keys = new Set<string>();
		const selectedCollectionKey = searchParams
			.getFilters()
			.get("collectionKey");
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
	const userOptions = createMemo(() =>
		(users.data?.data ?? []).map((user) => ({
			value: user.id,
			label:
				helpers.formatUserName(user, "simple") || T()("media.types.unknown"),
			user,
		})),
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		const selectedTarget = searchParams.getFilters().get("target");
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
									filters={[
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
											label: T()("common.status"),
											key: "status",
											type: "multi-select",
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
											],
										},
										{
											label: T()("common.execution.status"),
											key: "executionStatus",
											type: "multi-select",
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
											type: "multi-select",
											options: userOptions(),
											optionType: "user",
										},
										{
											label: T()("common.reviewers"),
											key: "reviewers",
											type: "multi-select",
											options: userOptions(),
											optionType: "user",
										},
									]}
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
