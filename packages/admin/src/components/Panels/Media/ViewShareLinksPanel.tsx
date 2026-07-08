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
	Index,
	Show,
} from "solid-js";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Filter } from "@/components/Groups/Query/Filter";
import { PerPage } from "@/components/Groups/Query/PerPage";
import { Sort } from "@/components/Groups/Query/Sort";
import { Table } from "@/components/Groups/Table/Table";
import DeleteShareLink from "@/components/Modals/Media/DeleteShareLink";
import UpsertShareLinkPanel from "@/components/Panels/Media/UpsertShareLinkPanel";
import ShareLinkRow from "@/components/Tables/Rows/ShareLinkRow";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

interface ViewShareLinksPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const ViewShareLinksPanel: Component<ViewShareLinksPanelProps> = (props) => {
	// ---------------------------------
	// Memos
	const panelContent = createMemo(() => {
		return {
			title: T()("panels.media.share.links.view.title"),
		};
	});

	// ---------------------------------
	// Render
	return (
		<BottomPanel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			options={{
				padding: "24",
				growContent: true,
			}}
			copy={panelContent()}
		>
			{() => (
				<ViewShareLinksPanelContent
					id={props.id}
					state={{
						open: props.state.open,
						setOpen: props.state.setOpen,
					}}
				/>
			)}
		</BottomPanel>
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
			},
			sorts: {
				name: sort(),
				expiresAt: sort(),
				createdAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 10 }),
		},
		options: {
			singleSort: true,
		},
	});

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
						<Filter
							filters={[
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
							]}
							searchParams={shareLinksSearchParams}
						/>
						<Sort
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
					<PerPage
						options={[5, 10, 20]}
						searchParams={shareLinksSearchParams}
					/>
				</div>
				<DynamicContent
					class="bg-card-base border border-border rounded-md"
					state={{
						isError: shareLinks.isError,
						isSuccess: shareLinks.isSuccess,
						isEmpty: shareLinks.data?.data.length === 0,
						searchParams: shareLinksSearchParams,
					}}
					slot={{
						footer: (
							<Paginated
								state={{
									searchParams: shareLinksSearchParams,
									meta: shareLinks.data?.meta,
								}}
								options={{
									embedded: true,
								}}
							/>
						),
					}}
					copy={{
						noEntries: {
							title: T()("empty.states.media.share.links.title"),
							description: T()("empty.states.media.share.links.description"),
						},
					}}
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
									<ShareLinkRow
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
				</DynamicContent>
			</Show>

			<UpsertShareLinkPanel
				mediaId={props.id}
				linkId={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
			/>
			<DeleteShareLink
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

export default ViewShareLinksPanel;
