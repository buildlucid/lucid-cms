import { useQueryClient } from "@tanstack/solid-query";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidT,
	FaSolidTag,
	FaSolidUser,
	FaSolidUsers,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, Index } from "solid-js";
import CreateMenu from "@/components/CreateMenu/CreateMenu";
import EmptyState from "@/components/EmptyState/EmptyState";
import type { FilterPreset } from "@/components/FilterPanel/preset-state";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import RequestCreateModal from "@/components/RequestCreateModal/RequestCreateModal";
import RequestTableRow from "@/components/RequestTableRow/RequestTableRow";
import Table from "@/components/Table/Table";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { countRequestQueue, requestQueues } from "@/utils/requests";

const RequestsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = createSignal(false);
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				type: textFilter(),
				title: textFilter(),
				status: textFilter({ defaultValue: "open" }),
				//* no default, so clearing it shows completed and closed requests too
				approval: textFilter(),
				scheduled: booleanFilter(),
				failed: booleanFilter(),
				assignedToMe: booleanFilter(),
				createdBy: numberFilter(),
				collectionKey: textFilter(),
				documentId: numberFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
				scheduledAt: textFilter(),
			},
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
				scheduledAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		singleSort: true,
	});

	// ----------------------------------------
	// Queries
	const requests = api.requests.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
		},
		enabled: () => searchParams.ready(),
	});
	const overview = api.requests.useGetOverview({ queryParams: {} });
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const presets = createMemo(() => {
		const overviewData = overview.data?.data;
		const items: FilterPreset[] = [
			...requestQueues.map(
				(queue): FilterPreset => ({
					key: queue.key,
					label: queue.label(),
					count: overviewData
						? countRequestQueue(overviewData, queue)
						: undefined,
					loading: overview.isFetching,
					filters: queue.filters,
				}),
			),
			{
				key: "publish",
				label: T()("requests.filter.publish"),
				count: overviewData
					? overviewData.publish.awaitingApproval +
						overviewData.publish.approved
					: undefined,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					type: { value: "publish", operator: "=" },
				},
			},
			{
				key: "create",
				label: T()("requests.filter.requests"),
				count: overviewData
					? overviewData.create.awaitingApproval + overviewData.create.approved
					: undefined,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					type: { value: "create", operator: "=" },
				},
			},
		];
		return items;
	});
	const collectionOptions = createMemo(() =>
		(collections.data?.data ?? []).map((collection) => ({
			value: collection.key,
			label:
				helpers.getLocaleValue({
					value: collection.details.labels.plural,
					fallback: collection.key,
				}) || collection.key,
		})),
	);

	// ----------------------------------------
	// Effects
	useKeyboardShortcuts({
		newEntry: {
			permission: () => true,
			callback: () => setCreateOpen(true),
		},
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("requests.title")}
				description={T()("requests.description")}
				actions={
					<CreateMenu
						actions={[
							{
								type: "button",
								label: T()("requests.create"),
								onClick: () => setCreateOpen(true),
							},
						]}
					/>
				}
			>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.requests.all(),
						});
					}}
					filterSubject={T()("requests.title")}
					filterPresets={presets()}
					filterFields={[
						{ label: T()("common.title"), key: "title", type: "text" },
						{
							label: T()("requests.type"),
							key: "type",
							type: "select",
							options: [
								{ label: T()("requests.type.publish"), value: "publish" },
								{ label: T()("requests.type.create"), value: "create" },
							],
						},
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: [
								{ label: T()("requests.state.open"), value: "open" },
								{ label: T()("requests.state.completed"), value: "completed" },
								{ label: T()("requests.state.closed"), value: "closed" },
							],
						},
						{
							label: T()("requests.filter.approval"),
							key: "approval",
							type: "select",
							options: [
								{ label: T()("requests.state.approved"), value: "approved" },
								{ label: T()("requests.state.pending"), value: "pending" },
							],
						},
						{
							label: T()("requests.filter.assigned"),
							key: "assignedToMe",
							type: "checkbox",
						},
						{
							label: T()("requests.filter.scheduled"),
							key: "scheduled",
							type: "checkbox",
						},
						{
							label: T()("requests.state.failed"),
							key: "failed",
							type: "checkbox",
						},
						{
							label: T()("common.created.by"),
							key: "createdBy",
							type: "user",
						},
						{
							label: T()("common.collection"),
							key: "collectionKey",
							type: "select",
							options: collectionOptions(),
						},
						{
							label: T()("common.created.at"),
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
					]}
					sorts={[
						{ label: T()("common.updated.at"), key: "updatedAt" },
						{ label: T()("common.created.at"), key: "createdAt" },
						{ label: T()("common.scheduled.for"), key: "scheduledAt" },
					]}
					perPage={[10, 20, 40]}
				/>
			</PageLayout.Header>
			<PageLayout.Body>
				<QueryBoundary
					error={requests.isError}
					empty={requests.data?.data.length === 0}
					queryState={searchParams}
					emptyFallback={
						<EmptyState
							title={T()("requests.empty.title")}
							description={T()("requests.empty.description")}
						/>
					}
					class="flex-1 h-full"
				>
					<Table.Root
						id="requests.list"
						rowCount={requests.data?.data.length ?? 0}
						queryState={searchParams}
						columns={[
							{
								label: T()("requests.request"),
								key: "title",
								icon: <FaSolidT />,
								minWidth: 280,
							},
							{
								label: T()("requests.type"),
								key: "type",
								icon: <FaSolidTag />,
							},
							{
								label: T()("common.status"),
								key: "status",
								icon: <FaSolidCircleCheck />,
							},
							{
								label: T()("requests.reviewers"),
								key: "reviewers",
								icon: <FaSolidUsers />,
							},
							{
								label: T()("common.created.by"),
								key: "createdBy",
								icon: <FaSolidUser />,
							},
							{
								label: T()("common.scheduled.for"),
								key: "scheduledAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
							{
								label: T()("common.updated.at"),
								key: "updatedAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
						]}
						loading={requests.isFetching}
					>
						<Index each={requests.data?.data ?? []}>
							{(request, index) => (
								<RequestTableRow
									index={index}
									request={request()}
									collections={collections.data?.data ?? []}
								/>
							)}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={requests.data?.meta}
					padding="md"
				/>
			</PageLayout.Body>
			<RequestCreateModal open={createOpen()} setOpen={setCreateOpen} />
		</PageLayout.Root>
	);
};

export default RequestsPage;
