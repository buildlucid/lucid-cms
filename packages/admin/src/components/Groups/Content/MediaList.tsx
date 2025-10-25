import T from "@/translations";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Show,
	createSignal,
} from "solid-js";
import type useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import useRowTarget from "@/hooks/useRowTarget";
import contentLocaleStore from "@/store/contentLocaleStore";
import { Paginated } from "@/components/Groups/Footers";
import { DynamicContent } from "@/components/Groups/Layout";
import { Grid } from "@/components/Groups/Grid";
import MediaCard, { MediaCardLoading } from "@/components/Cards/MediaCard";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import ViewMediaPanel from "@/components/Panels/Media/ViewMediaPanel";
import UpsertShareLinkPanel from "@/components/Panels/Media/UpsertShareLinkPanel";
import ViewShareLinksPanel from "@/components/Panels/Media/ViewShareLinksPanel";
import CopyShareLinkURL from "@/components/Modals/Media/CopyShareLinkURL";
import DeleteMedia from "@/components/Modals/Media/DeleteMedia";
import ClearProcessedMedia from "@/components/Modals/Media/ClearProcessedImages";
import DeleteMediaBatch from "@/components/Modals/Media/DeleteMediaBatch";
import DeleteAllShareLinks from "@/components/Modals/Media/DeleteAllShareLinks";
import {
	MediaFolderCardLoading,
	MediaFolderCard,
} from "@/components/Cards/MediaFolderCard";
import {
	Breadcrumbs,
	SelectedActionPill,
} from "@/components/Groups/MediaLibrary";
import mediaStore from "@/store/mediaStore";
import RestoreMedia from "@/components/Modals/Media/RestoreMedia";
import DeleteMediaPermanently from "@/components/Modals/Media/DeleteMediaPermanently";
import {
	DragDropProvider,
	DragDropSensors,
	type DragEventHandler,
} from "@thisbeyond/solid-dnd";
import MoveToFolder, {
	type MoveToFolderParams,
} from "@/components/Modals/Media/MoveToFolder";
import classNames from "classnames";
import UpdateMediaFolderPanel from "@/components/Panels/Media/UpdateMediaFolderPanel";

export const MediaList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		showingDeleted: Accessor<boolean>;
		setOpenCreateMediaPanel: (state: boolean) => void;
		parentFolderId: Accessor<number | string | undefined>;
	};
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const rowTarget = useRowTarget({
		triggers: {
			update: false,
			delete: false,
			clear: false,
			restore: false,
			deletePermanently: false,
			deleteBatch: false,
			moveToFolder: false,
			view: false,
			updateFolder: false,
			createShareLink: false,
			viewShareLinks: false,
			copyShareLinkURL: false,
			deleteAllShareLinks: false,
		},
	});
	const [isDragging, setIsDragging] = createSignal(false);
	const [getMoveModalParams, setMoveModalParams] =
		createSignal<MoveToFolderParams>({
			mode: "media",
			itemId: null,
			target: null,
		});
	const [getCreatedShareLinkIds, setCreatedShareLinkIds] =
		createSignal<[number, number]>();

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const isDeletedFilter = createMemo(() =>
		props.state.showingDeleted() ? 1 : 0,
	);

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
			filters: {
				folderId: props.state.parentFolderId,
				isDeleted: isDeletedFilter,
			},
			headers: {
				"lucid-content-locale": contentLocale,
			},
		},
		enabled: () => props.state.searchParams.getSettled(),
	});
	const folders = api.mediaFolders.useGetMultiple({
		queryParams: {
			filters: {
				parentFolderId: props.state.parentFolderId,
			},
			perPage: -1,
		},
	});

	// ----------------------------------------
	// Functions
	const onDragEnd: DragEventHandler = (e) => {
		if (
			e.draggable?.id &&
			e.droppable?.id &&
			e.draggable?.id !== e.droppable.id &&
			typeof e.draggable.id === "string" &&
			typeof e.droppable.id === "string"
		) {
			const draggableId = Number(e.draggable.id.split(":")[1]);
			const droppableId = Number(e.droppable.id.split(":")[1]);
			const mode = e.draggable.id.split(":")[0] as "folder" | "media";

			setMoveModalParams({
				mode: mode,
				itemId: draggableId,
				target: droppableId,
			});
			rowTarget.setTrigger("moveToFolder", true);
		}
		setTimeout(() => setIsDragging(false), 100);
	};
	const onDragStart: DragEventHandler = () => {
		setIsDragging(true);
	};
	const openCreateMediaPanel = () => {
		props.state.setOpenCreateMediaPanel(true);
	};

	// ----------------------------------------
	// Memos
	const foldersCount = createMemo(() => folders.data?.data.folders.length || 0);
	const mediaCount = createMemo(() => media.data?.data.length || 0);
	const isTopLevel = createMemo(() => props.state.parentFolderId() === "");
	const isError = createMemo(() => {
		return media.isError || folders.isError;
	});
	const isSuccess = createMemo(() => {
		return media.isSuccess && folders.isSuccess;
	});
	const containerEmpty = createMemo(() => {
		if (props.state.showingDeleted()) return mediaCount() === 0;
		//* if we're at the top level and there are no folders or media, we're empty
		return isTopLevel() && foldersCount() === 0 && mediaCount() === 0;
	});
	const noEntriesCopy = createMemo(() => {
		if (props.state.showingDeleted()) {
			return {
				title: T()("no_deleted_media"),
				description: T()("no_deleted_media_description"),
			};
		}
		return {
			title: T()("no_media"),
			description: T()("no_media_description"),
			button: T()("upload_media"),
		};
	});
	const createEntryCallback = createMemo(() => {
		if (props.state.showingDeleted()) {
			return undefined;
		}
		return openCreateMediaPanel;
	});
	const showFoldersSection = createMemo(() => {
		return (
			!props.state.showingDeleted() && (!isTopLevel() || foldersCount() > 0)
		);
	});
	const mediaGridNoEntriesCopy = createMemo(() => {
		if (isTopLevel()) {
			return {
				title: T()("no_media"),
				description: T()("no_media_description"),
				button: T()("upload_media"),
			};
		}
		return {
			title: T()("no_media_in_folder"),
			description: T()("no_media_in_folder_description"),
			button: T()("upload_media"),
		};
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: isError(),
				isSuccess: isSuccess(),
				isEmpty: containerEmpty(),
				searchParams: props.state.searchParams,
			}}
			slot={{
				footer: (
					<Paginated
						state={{
							searchParams: props.state.searchParams,
							meta: media.data?.meta,
						}}
						options={{
							padding: "24",
						}}
					/>
				),
			}}
			copy={{
				noEntries: noEntriesCopy(),
			}}
			callback={{
				createEntry: createEntryCallback(),
			}}
			options={{
				padding: "24",
			}}
		>
			<DragDropProvider onDragEnd={onDragEnd} onDragStart={onDragStart}>
				<DragDropSensors />
				{/* Folders */}
				<Show when={showFoldersSection()}>
					<Breadcrumbs
						state={{
							parentFolderId: props.state.parentFolderId,
							breadcrumbs: folders.data?.data.breadcrumbs ?? [],
						}}
					/>
					<Grid
						state={{
							isLoading: folders.isLoading,
							totalItems: foldersCount(),
						}}
						options={{
							disableEmpty: true,
						}}
						slots={{
							loadingCard: <MediaFolderCardLoading />,
						}}
						class={classNames(
							"border-b border-border pb-4 md:pb-6 mb-4 md:mb-6",
							{
								"mt-4": foldersCount() > 0,
							},
						)}
					>
						<For each={folders.data?.data.folders}>
							{(folder) => (
								<MediaFolderCard
									folder={folder}
									isDragging={isDragging}
									rowTarget={rowTarget}
								/>
							)}
						</For>
					</Grid>
				</Show>

				{/* Media */}
				<Grid
					state={{
						isLoading: media.isFetching,
						totalItems: mediaCount(),
						searchParams: props.state.searchParams,
					}}
					slots={{
						loadingCard: <MediaCardLoading />,
					}}
					copy={{
						empty: mediaGridNoEntriesCopy(),
					}}
					callback={{
						createEntry: createEntryCallback(),
					}}
					options={{
						growWhenEmpty: true,
					}}
				>
					<For each={media.data?.data}>
						{(item) => (
							<MediaCard
								media={item}
								rowTarget={rowTarget}
								contentLocale={contentLocale()}
								showingDeleted={props.state.showingDeleted}
								isDragging={isDragging}
							/>
						)}
					</For>
				</Grid>
			</DragDropProvider>

			<SelectedActionPill
				state={{
					selectedFolders: mediaStore.get.selectedFolders,
					selectedMedia: mediaStore.get.selectedMedia,
				}}
				actions={{
					addSelectedFolder: mediaStore.get.addSelectedFolder,
					addSelectedMedia: mediaStore.get.addSelectedMedia,
					resetSelectedFolders: mediaStore.get.resetSelectedFolders,
					resetSelectedMedia: mediaStore.get.resetSelectedMedia,
					deleteAction: () => {
						rowTarget.setTrigger("deleteBatch", true);
					},
				}}
			/>

			{/* Modals */}
			<MoveToFolder
				state={{
					open: rowTarget.getTriggers().moveToFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("moveToFolder", state);
					},
					params: getMoveModalParams(),
				}}
			/>
			<CreateUpdateMediaPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<ViewMediaPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().view,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("view", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<UpsertShareLinkPanel
				mediaId={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().createShareLink,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("createShareLink", state);
					},
				}}
				callbacks={{
					onCreateSuccess: (mediaId: number, shareLinkId: number) => {
						setCreatedShareLinkIds([mediaId, shareLinkId]);
						rowTarget.setTrigger("copyShareLinkURL", true);
					},
				}}
			/>
			<ViewShareLinksPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().viewShareLinks,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("viewShareLinks", state);
					},
				}}
			/>
			<UpdateMediaFolderPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().updateFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("updateFolder", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<DeleteMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<DeleteMediaPermanently
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deletePermanently,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deletePermanently", state);
					},
				}}
			/>
			<RestoreMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().restore,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("restore", state);
					},
				}}
			/>
			<ClearProcessedMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().clear,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("clear", state);
					},
				}}
			/>
			<DeleteMediaBatch
				state={{
					open: rowTarget.getTriggers().deleteBatch,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteBatch", state);
					},
				}}
			/>
			<CopyShareLinkURL
				ids={getCreatedShareLinkIds}
				state={{
					open: rowTarget.getTriggers().copyShareLinkURL,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("copyShareLinkURL", state);
					},
				}}
			/>
			<DeleteAllShareLinks
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deleteAllShareLinks,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteAllShareLinks", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
