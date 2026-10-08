import { useQueryClient } from "@tanstack/solid-query";
import {
	TbOutlineBell,
	TbOutlineCalendar,
	TbOutlineChecks,
	TbOutlineCircleCheck,
	TbOutlineTag,
	TbOutlineUser,
} from "solid-icons/tb";
import { type Component, createMemo, Index } from "solid-js";
import ArchiveNotificationModal from "@/components/ArchiveNotificationModal/ArchiveNotificationModal";
import Button from "@/components/Button/Button";
import EmptyState from "@/components/EmptyState/EmptyState";
import type { FilterPreset } from "@/components/FilterPanel/preset-state";
import NotificationTableRow from "@/components/NotificationTableRow/NotificationTableRow";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pagination from "@/components/Pagination/Pagination";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import Table, { type TableSelectActionItem } from "@/components/Table/Table";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import type { Params as UpdateNotificationsParams } from "@/services/api/notifications/useUpdateMultiple";
import { queryKeys } from "@/services/query-keys";
import T from "@/translations";
import {
	getNotificationsListKey,
	groupByCategory,
} from "@/utils/notifications";

const NotificationsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				status: textFilter({ defaultValue: "inbox" }),
				category: textFilter(),
				type: textFilter(),
			},
			sorts: {
				updatedAt: sort({ defaultValue: "desc" }),
				createdAt: sort(),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		singleSort: true,
	});
	const rowTarget = useRowTarget({ triggers: { archive: false } });

	// ----------------------------------------
	// Queries & Mutations
	const summary = api.notifications.useGetSummary();
	const notifications = api.notifications.useGetMultiple({
		queryParams: { queryString: searchParams.queryString },
		key: () => getNotificationsListKey(summary.data?.data),
		enabled: () => searchParams.ready() && summary.data !== undefined,
	});
	//* the person's own types, for the category and type filters
	const preferences = api.notifications.useGetPreferences();
	const update = api.notifications.useUpdateMultiple();
	const markAllRead = api.notifications.useUpdateMultiple();

	// ----------------------------------------
	// Memos
	const presets = createMemo<FilterPreset[]>(() => [
		{
			key: "inbox",
			label: T()("notifications.filter.inbox"),
			filters: { status: { value: "inbox", operator: "=" } },
		},
		{
			key: "unread",
			label: T()("notifications.filter.unread"),
			count: summary.data?.data.unread,
			loading: summary.isLoading,
			filters: { status: { value: "unread", operator: "=" } },
		},
		{
			key: "attention",
			label: T()("notifications.filter.attention"),
			count: summary.data?.data.actionRequired,
			loading: summary.isLoading,
			filters: { status: { value: "attention", operator: "=" } },
		},
		{
			key: "archived",
			label: T()("notifications.filter.archived"),
			filters: { status: { value: "archived", operator: "=" } },
		},
	]);
	const categoryOptions = createMemo(() =>
		groupByCategory(preferences.data?.data ?? []).map((group) => ({
			value: group.key,
			label: group.label,
		})),
	);
	const typeOptions = createMemo(() =>
		(preferences.data?.data ?? []).map((preference) => ({
			value: preference.type,
			label: `${preference.category.label} · ${preference.name}`,
		})),
	);
	const showingArchived = createMemo(
		() => searchParams.filters().get("status") === "archived",
	);
	const selectActions = createMemo<TableSelectActionItem[]>(() => [
		showingArchived()
			? {
					label: T()("notifications.unarchive"),
					variant: "primary",
					confirm: {
						title: T()("modals.notifications.unarchive.items.title"),
						description: T()(
							"modals.notifications.unarchive.items.description",
						),
					},
					onClick: (selected) => updateSelected(selected, { archived: false }),
				}
			: {
					label: T()("notifications.archive"),
					variant: "danger",
					confirm: {
						title: T()("modals.notifications.archive.items.title"),
						description: T()("modals.notifications.archive.items.description"),
						confirmVariant: "danger",
					},
					onClick: (selected) =>
						updateSelected(selected, { archived: true, read: true }),
				},
		{
			label: T()("notifications.mark.read"),
			confirm: {
				title: T()("modals.notifications.read.items.title"),
				description: T()("modals.notifications.read.items.description"),
			},
			onClick: (selected) => updateSelected(selected, { read: true }),
		},
		{
			label: T()("notifications.mark.unread"),
			confirm: {
				title: T()("modals.notifications.unread.items.title"),
				description: T()("modals.notifications.unread.items.description"),
			},
			onClick: (selected) => updateSelected(selected, { read: false }),
		},
	]);

	// ----------------------------------------
	// Functions
	const updateSelected = async (
		selected: boolean[],
		changes: Pick<UpdateNotificationsParams, "read" | "archived">,
	) => {
		const ids = (notifications.data?.data ?? [])
			.filter((_, index) => selected[index])
			.map((notification) => notification.id);
		if (ids.length === 0) return;
		await update.action.mutateAsync({ ids, ...changes });
	};

	// ----------------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("notifications.title")}
				description={T()("notifications.description")}
				actions={
					<Button
						size="sm"
						variant="outline"
						disabled={(summary.data?.data.unread ?? 0) === 0}
						loading={markAllRead.action.isPending}
						onClick={() => markAllRead.action.mutate({ all: true, read: true })}
					>
						<TbOutlineChecks class="me-1.5 size-3" />
						{T()("notifications.mark.all.read")}
					</Button>
				}
			>
				<QueryToolbar
					queryState={searchParams}
					onRefresh={() => {
						queryClient.invalidateQueries({
							queryKey: queryKeys.notifications.all(),
						});
					}}
					filterSubject={T()("notifications.title")}
					filterPresets={presets()}
					filterFields={[
						{
							label: T()("notifications.category"),
							key: "category",
							type: "select",
							options: categoryOptions(),
						},
						{
							label: T()("common.type"),
							key: "type",
							type: "select",
							options: typeOptions(),
						},
					]}
					sorts={[
						{ label: T()("common.updated.at"), key: "updatedAt" },
						{ label: T()("common.created.at"), key: "createdAt" },
					]}
					perPage={[10, 20, 40]}
				/>
			</PageLayout.Header>
			<PageLayout.Body>
				<QueryBoundary
					error={summary.isError || notifications.isError}
					empty={notifications.data?.data.length === 0}
					queryState={searchParams}
					emptyFallback={
						<EmptyState
							title={T()("notifications.empty.title")}
							description={T()("notifications.empty.description")}
						/>
					}
					class="flex-1 h-full"
				>
					<Table.Root
						id="notifications.list"
						rowCount={notifications.data?.data.length ?? 0}
						data={notifications.data?.data}
						queryState={searchParams}
						loading={summary.isLoading || notifications.isLoading}
						selectable
						selectActions={selectActions()}
						columns={[
							{
								label: T()("notifications.singular"),
								key: "title",
								icon: <TbOutlineBell />,
								minWidth: 320,
							},
							{
								label: T()("common.status"),
								key: "status",
								icon: <TbOutlineCircleCheck />,
								minWidth: 140,
							},
							{
								label: T()("notifications.category"),
								key: "category",
								icon: <TbOutlineTag />,
								minWidth: 140,
							},
							{
								label: T()("common.from"),
								key: "actor",
								icon: <TbOutlineUser />,
								minWidth: 160,
							},
							{
								label: T()("common.updated.at"),
								key: "updatedAt",
								icon: <TbOutlineCalendar />,
								sortable: true,
								minWidth: 170,
							},
						]}
					>
						<Index each={notifications.data?.data ?? []}>
							{(notification, index) => (
								<NotificationTableRow
									index={index}
									notification={notification()}
									onUpdate={update.action.mutate}
									onArchive={(id) => {
										rowTarget.setTargetId(id);
										rowTarget.setTrigger("archive", true);
									}}
								/>
							)}
						</Index>
					</Table.Root>
					<ArchiveNotificationModal
						id={rowTarget.getTargetId}
						state={{
							open: rowTarget.getTriggers().archive,
							setOpen: (state) => rowTarget.setTrigger("archive", state),
						}}
					/>
				</QueryBoundary>
				<Pagination
					queryState={searchParams}
					meta={notifications.data?.meta}
					padding="md"
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default NotificationsPage;
