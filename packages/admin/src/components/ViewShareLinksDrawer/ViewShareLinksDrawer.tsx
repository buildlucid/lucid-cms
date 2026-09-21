import classnames from "classnames";
import {
	FaSolidCalendar,
	FaSolidClock,
	FaSolidLink,
	FaSolidLock,
	FaSolidT,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	Index,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DeleteShareLinkModal from "@/components/DeleteShareLinkModal/DeleteShareLinkModal";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import { FilterSection } from "@/components/FilterSection/FilterSection";
import { FilterSectionToggle } from "@/components/FilterSectionToggle/FilterSectionToggle";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import { PerPageSelect } from "@/components/PerPageSelect/PerPageSelect";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { QuerySort } from "@/components/QuerySort/QuerySort";
import ShareLinkTableRow from "@/components/ShareLinkTableRow/ShareLinkTableRow";
import { Table } from "@/components/Table/Table";
import UpsertShareLinkDrawer from "@/components/UpsertShareLinkDrawer/UpsertShareLinkDrawer";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

interface ViewShareLinksPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewShareLinksDrawer: Component<ViewShareLinksPanelProps> = (props) => {
	// ---------------------------------
	// Memos

	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
		>
			<Drawer.Header>
				<Drawer.Title>
					{T()("panels.media.share.links.view.title")}
				</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<ViewShareLinksPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
					}}
				/>
			</Drawer.Body>
			<Drawer.Footer>
				<Drawer.Actions>
					<Button
						size="md"
						variant="outline"
						onClick={() => props.state.setOpen(false)}
					>
						{T()("common.close")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>
		</Drawer.Root>
	);
};

const ViewShareLinksPanelContent: Component<{
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ---------------------------------
	// Hooks
	const shareLinksSearchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				name: textFilter(),
				token: textFilter(),
				createdBy: numberFilter(),
				updatedBy: numberFilter(),
				expiresAt: textFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				name: sort(),
				expiresAt: sort(),
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		singleSort: true,
	});
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);

	const rowTarget = useRowTarget<"delete" | "update">({
		triggers: {
			delete: false,
			update: false,
		},
	});

	// ---------------------------------
	// Memos
	const canFetch = createMemo(() => {
		return (
			props.state.open &&
			props.id !== undefined &&
			shareLinksSearchParams.ready()
		);
	});
	const canUpdateShareLinks = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaUpdate]).all,
	);
	const canDeleteShareLinks = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaDelete]).all,
	);

	// ---------------------------------
	// Queries
	const shareLinks = api.mediaShareLinks.useGetMultiple({
		queryParams: {
			location: {
				mediaId: props.id as Accessor<number | undefined>,
			},
			queryString: shareLinksSearchParams.queryString,
		},
		enabled: canFetch,
	});

	// ---------------------------------
	// Render
	return (
		<div class="flex flex-col h-full">
			<Show when={props.id !== undefined}>
				<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
					<div class="flex gap-2.5">
						<FilterSectionToggle
							open={filterSectionOpen()}
							onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
							searchParams={shareLinksSearchParams}
						/>
						<QuerySort
							sorts={[
								{
									label: T()("common.name"),
									key: "name",
								},
								{
									label: T()("common.expires.at"),
									key: "expiresAt",
								},
								{
									label: T()("common.created.at"),
									key: "createdAt",
								},
							]}
							searchParams={shareLinksSearchParams}
						/>
					</div>
					<PerPageSelect
						options={[5, 10, 20]}
						searchParams={shareLinksSearchParams}
					/>
				</div>
				<FilterSection
					open={filterSectionOpen()}
					setOpen={setFilterSectionOpen}
					subject={T()("panels.media.share.links.view.title")}
					fields={[
						{
							label: T()("common.name"),
							key: "name",
							type: "text",
						},
						{
							label: T()("common.token"),
							key: "token",
							type: "text",
						},
						{
							label: T()("common.created.by"),
							key: "createdBy",
							type: "user",
						},
						{
							label: T()("common.updated.by"),
							key: "updatedBy",
							type: "user",
						},
						{
							label: T()("common.expires.at"),
							key: "expiresAt",
							type: "datetime",
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
					]}
					searchParams={shareLinksSearchParams}
					embedded={true}
				/>
				<QueryBoundary
					isError={shareLinks.isError}
					isEmpty={shareLinks.data?.data.length === 0}
					queryState={shareLinksSearchParams}
					empty={
						<EmptyState
							title={T()("empty.states.media.share.links.title")}
							description={T()("empty.states.media.share.links.description")}
						/>
					}
					class={classnames(
						"flex-1 h-full",
						"bg-card-base border border-border rounded-md",
					)}
				>
					<Table
						key={"media.shareLinks"}
						rows={shareLinks.data?.data.length || 0}
						searchParams={shareLinksSearchParams}
						head={[
							{
								label: T()("common.url"),
								key: "url",
								icon: <FaSolidLink />,
							},
							{
								label: T()("common.name"),
								key: "name",
								icon: <FaSolidT />,
								sortable: true,
							},
							{
								label: T()("common.has.password"),
								key: "hasPassword",
								icon: <FaSolidLock />,
							},
							{
								label: T()("common.expires.at"),
								key: "expiresAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
							{
								label: T()("common.has.expired"),
								key: "hasExpired",
								icon: <FaSolidClock />,
							},
							{
								label: T()("common.created.at"),
								key: "createdAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
						]}
						state={{
							isLoading: shareLinks.isFetching,
							isSuccess: shareLinks.isSuccess,
						}}
						options={{
							isSelectable: false,
							padding: "16",
						}}
						theme="secondary"
					>
						{({ include, isSelectable, selected, setSelected }) => (
							<Index each={shareLinks.data?.data || []}>
								{(link, i) => (
									<ShareLinkTableRow
										link={link()}
										include={include}
										selected={selected[i]}
										options={{
											isSelectable,
											padding: "16",
											raisedActions: true,
										}}
										callbacks={{
											setSelected: setSelected,
										}}
										rowTarget={rowTarget}
										theme="secondary"
										index={i}
										permissions={{
											update: canUpdateShareLinks(),
											delete: canDeleteShareLinks(),
										}}
									/>
								)}
							</Index>
						)}
					</Table>
				</QueryBoundary>
				<PaginatedFooter
					state={{
						searchParams: shareLinksSearchParams,
						meta: shareLinks.data?.meta,
					}}
					options={{
						embedded: true,
					}}
				/>
			</Show>

			<UpsertShareLinkDrawer
				mediaId={props.id}
				linkId={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<DeleteShareLinkModal
				mediaId={props.id}
				linkId={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
		</div>
	);
};

export default ViewShareLinksDrawer;
