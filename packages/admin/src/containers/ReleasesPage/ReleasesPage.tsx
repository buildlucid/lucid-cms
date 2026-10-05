import { useQueryClient } from "@tanstack/solid-query";
import {
	FaSolidCalendar,
	FaSolidCircleCheck,
	FaSolidT,
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
import ReleaseCreateModal from "@/components/ReleaseCreateModal/ReleaseCreateModal";
import ReleaseTableRow from "@/components/ReleaseTableRow/ReleaseTableRow";
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

const ReleasesPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = createSignal(false);
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				title: textFilter(),
				status: textFilter({ defaultValue: "open" }),
				approval: textFilter({ defaultValue: "pending" }),
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
	const releases = api.releases.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
		},
		enabled: () => searchParams.ready(),
	});
	const overview = api.releases.useGetOverview({ queryParams: {} });
	const collections = api.collections.useGetAll({ queryParams: {} });

	// ----------------------------------------
	// Memos
	const presets = createMemo(() => {
		const counts = overview.data?.data;
		const items: FilterPreset[] = [
			{
				key: "pending",
				label: T()("releases.state.pending"),
				count: counts?.awaitingApproval,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					approval: { value: "pending", operator: "=" },
				},
			},
			{
				key: "assigned",
				label: T()("releases.filter.assigned"),
				count: counts?.assignedToMe,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					assignedToMe: { value: true, operator: "=" },
				},
			},
			{
				key: "approved",
				label: T()("releases.state.approved"),
				count: counts?.approved,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					approval: { value: "approved", operator: "=" },
				},
			},
			{
				key: "failed",
				label: T()("releases.state.failed"),
				count: counts?.failed,
				loading: overview.isFetching,
				filters: {
					status: { value: "open", operator: "=" },
					failed: { value: true, operator: "=" },
				},
			},
		];
		return items;
	});
	const collectionOptions = createMemo(() =>
		(collections.data?.data ?? [])
			.filter((collection) => collection.publishing.targets.length > 0)
			.map((collection) => ({
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
				title={T()("releases.title")}
				description={T()("releases.description")}
				actions={
					<CreateMenu
						actions={[
							{
								type: "button",
								label: T()("releases.create"),
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
							queryKey: queryKeys.releases.all(),
						});
					}}
					filterSubject={T()("releases.title")}
					filterPresets={presets()}
					filterFields={[
						{ label: T()("common.title"), key: "title", type: "text" },
						{
							label: T()("common.status"),
							key: "status",
							type: "select",
							options: [
								{ label: T()("releases.state.open"), value: "open" },
								{ label: T()("releases.state.released"), value: "released" },
								{ label: T()("releases.state.closed"), value: "closed" },
							],
						},
						{
							label: T()("releases.filter.approval"),
							key: "approval",
							type: "select",
							options: [
								{ label: T()("releases.state.approved"), value: "approved" },
								{ label: T()("releases.state.pending"), value: "pending" },
							],
						},
						{
							label: T()("releases.filter.assigned"),
							key: "assignedToMe",
							type: "checkbox",
						},
						{
							label: T()("releases.filter.scheduled"),
							key: "scheduled",
							type: "checkbox",
						},
						{
							label: T()("releases.state.failed"),
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
					error={releases.isError}
					empty={releases.data?.data.length === 0}
					queryState={searchParams}
					emptyFallback={
						<EmptyState
							title={T()("releases.empty.title")}
							description={T()("releases.empty.description")}
						/>
					}
					class="flex-1 h-full"
				>
					<Table.Root
						id="releases.list"
						rowCount={releases.data?.data.length ?? 0}
						queryState={searchParams}
						columns={[
							{
								label: T()("releases.release"),
								key: "title",
								icon: <FaSolidT />,
								minWidth: 280,
							},
							{
								label: T()("common.status"),
								key: "status",
								icon: <FaSolidCircleCheck />,
							},
							{
								label: T()("releases.reviewers"),
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
						loading={releases.isFetching}
					>
						<Index each={releases.data?.data ?? []}>
							{(release, index) => (
								<ReleaseTableRow
									index={index}
									release={release()}
									collections={collections.data?.data ?? []}
								/>
							)}
						</Index>
					</Table.Root>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={releases.data?.meta}
					padding="md"
				/>
			</PageLayout.Body>
			<ReleaseCreateModal open={createOpen()} setOpen={setCreateOpen} />
		</PageLayout.Root>
	);
};

export default ReleasesPage;
