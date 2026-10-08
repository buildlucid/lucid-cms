import { useQueryClient } from "@tanstack/solid-query";
import {
	TbOutlineCalendar,
	TbOutlineCircleCheck,
	TbOutlineLetterT,
	TbOutlineTag,
	TbOutlineUser,
	TbOutlineUsers,
} from "solid-icons/tb";
import { type Component, createMemo, createSignal, Index } from "solid-js";
import CreateMenu from "@/components/CreateMenu/CreateMenu";
import EmptyState from "@/components/EmptyState/EmptyState";
import type { FilterPreset } from "@/components/FilterPanel/preset-state";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import RequestCreateModal from "@/components/RequestCreateModal/RequestCreateModal";
import RequestDeleteModal from "@/components/RequestDeleteModal/RequestDeleteModal";
import RequestTableRow from "@/components/RequestTableRow/RequestTableRow";
import RequestUnpublishModal from "@/components/RequestUnpublishModal/RequestUnpublishModal";
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
import {
	countRequestQueue,
	requestQueues,
	requestTypeKeys,
	requestTypes,
} from "@/utils/requests";

const RequestsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = createSignal(false);
	const [unpublishOpen, setUnpublishOpen] = createSignal(false);
	const [deleteOpen, setDeleteOpen] = createSignal(false);
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
			...requestTypeKeys.map(
				(type): FilterPreset => ({
					key: type,
					label: requestTypes[type].filter(),
					count: overviewData
						? overviewData[type].awaitingApproval + overviewData[type].approved
						: undefined,
					loading: overview.isFetching,
					filters: {
						status: { value: "open", operator: "=" },
						type: { value: type, operator: "=" },
					},
				}),
			),
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
								label: T()("requests.create.publish.action"),
								icon: "upload",
								onClick: () => setCreateOpen(true),
							},
							{
								type: "button",
								label: T()("requests.create.unpublish.action"),
								icon: "cloud-off",
								onClick: () => setUnpublishOpen(true),
							},
							{
								type: "button",
								label: T()("requests.create.delete.action"),
								icon: "trash",
								onClick: () => setDeleteOpen(true),
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
							options: requestTypeKeys.map((type) => ({
								label: requestTypes[type].label(),
								value: type,
							})),
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
								icon: <TbOutlineLetterT />,
								minWidth: 280,
							},
							{
								label: T()("requests.type"),
								key: "type",
								icon: <TbOutlineTag />,
							},
							{
								label: T()("common.status"),
								key: "status",
								icon: <TbOutlineCircleCheck />,
							},
							{
								label: T()("requests.reviewers"),
								key: "reviewers",
								icon: <TbOutlineUsers />,
							},
							{
								label: T()("common.created.by"),
								key: "createdBy",
								icon: <TbOutlineUser />,
							},
							{
								label: T()("common.scheduled.for"),
								key: "scheduledAt",
								icon: <TbOutlineCalendar />,
								sortable: true,
							},
							{
								label: T()("common.updated.at"),
								key: "updatedAt",
								icon: <TbOutlineCalendar />,
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
			<RequestUnpublishModal
				open={unpublishOpen()}
				setOpen={setUnpublishOpen}
			/>
			<RequestDeleteModal open={deleteOpen()} setOpen={setDeleteOpen} />
		</PageLayout.Root>
	);
};

export default RequestsPage;
