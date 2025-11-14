import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	Show,
	Index,
} from "solid-js";
import {
	FaSolidLink,
	FaSolidCalendar,
	FaSolidLock,
	FaSolidT,
	FaSolidClock,
} from "solid-icons/fa";
import api from "@/services/api";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Table } from "@/components/Groups/Table";
import { DynamicContent } from "@/components/Groups/Layout";
import { Paginated } from "@/components/Groups/Footers";
import { Filter, Sort, PerPage } from "@/components/Groups/Query";
import useRowTarget from "@/hooks/useRowTarget";
import ShareLinkRow from "@/components/Tables/Rows/ShareLinkRow";
import DeleteShareLink from "@/components/Modals/Media/DeleteShareLink";
import UpsertShareLinkPanel from "@/components/Panels/Media/UpsertShareLinkPanel";
import userStore from "@/store/userStore";

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
			title: T()("view_share_links_panel_title"),
			description: T()("view_share_links_panel_description"),
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
				hideFooter: true,
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
	const shareLinksSearchParams = useSearchParamsState(
		{
			filters: {
				name: {
					value: "",
					type: "text",
				},
				token: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				name: undefined,
				expiresAt: undefined,
				createdAt: "desc",
			},
			pagination: {
				perPage: 10,
			},
		},
		{
			singleSort: true,
		},
	);

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
			shareLinksSearchParams.getSettled()
		);
	});
	const canUpdateShareLinks = createMemo(
		() => userStore.get.hasPermission(["update_media"]).all,
	);
	const canDeleteShareLinks = createMemo(
		() => userStore.get.hasPermission(["delete_media"]).all,
	);

	// ---------------------------------
	// Queries
	const shareLinks = api.mediaShareLinks.useGetMultiple({
		queryParams: {
			location: {
				mediaId: props.id as Accessor<number | undefined>,
			},
			queryString: shareLinksSearchParams.getQueryString,
		},
		enabled: canFetch,
	});

	// ---------------------------------
	// Render
	return (
		<div class="flex flex-col h-full pb-4">
			<Show when={props.id !== undefined}>
				<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
					<div class="flex gap-2.5">
						<Filter
							filters={[
								{
									label: T()("name"),
									key: "name",
									type: "text",
								},
								{
									label: T()("token"),
									key: "token",
									type: "text",
								},
							]}
							searchParams={shareLinksSearchParams}
						/>
						<Sort
							sorts={[
								{
									label: T()("name"),
									key: "name",
								},
								{
									label: T()("expires_at"),
									key: "expiresAt",
								},
								{
									label: T()("created_at"),
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
							title: T()("no_share_links"),
							description: T()("no_share_links_description"),
						},
					}}
				>
					<Table
						key={"media.shareLinks"}
						rows={shareLinks.data?.data.length || 0}
						searchParams={shareLinksSearchParams}
						head={[
							{
								label: T()("url"),
								key: "url",
								icon: <FaSolidLink />,
							},
							{
								label: T()("name"),
								key: "name",
								icon: <FaSolidT />,
								sortable: true,
							},
							{
								label: T()("has_password"),
								key: "hasPassword",
								icon: <FaSolidLock />,
							},
							{
								label: T()("expires_at"),
								key: "expiresAt",
								icon: <FaSolidCalendar />,
								sortable: true,
							},
							{
								label: T()("has_expired"),
								key: "hasExpired",
								icon: <FaSolidClock />,
							},
							{
								label: T()("created_at"),
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
