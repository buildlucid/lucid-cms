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
import DeleteMedia from "@/components/Modals/Media/DeleteMedia";
import ClearProcessedMedia from "@/components/Modals/Media/ClearProcessedImages";
import DeleteMediaBatch from "@/components/Modals/Media/DeleteMediaBatch";
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

export const MediaList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		showingDeleted: Accessor<boolean>;
		setOpenCreateMediaPanel: (state: boolean) => void;
		parentFolderId: Accessor<number | string>;
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
		},
	});
	const [isDragging, setIsDragging] = createSignal(false);
	const [getMoveModalParams, setMoveModalParams] =
		createSignal<MoveToFolderParams>({
			mode: "media",
			itemId: null,
			target: null,
		});

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

	// ----------------------------------------
	// Memos
	const isError = createMemo(() => {
		return media.isError || folders.isError;
	});
	const isSuccess = createMemo(() => {
		return media.isSuccess && folders.isSuccess;
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: isError(),
				isSuccess: isSuccess(),
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
				noEntries: {
					title: T()("no_media"),
					description: T()("no_media_description"),
					button: T()("upload_media"),
				},
			}}
			callback={{
				createEntry: () => props.state.setOpenCreateMediaPanel(true),
			}}
			options={{
				padding: "24",
			}}
		>
			<DragDropProvider onDragEnd={onDragEnd} onDragStart={onDragStart}>
				<DragDropSensors />
				{/* Folders */}
				<Show when={!props.state.showingDeleted()}>
					<div class="flex flex-col mb-4">
						<h3 class="mb-1">{T()("folders")}</h3>
						<Breadcrumbs
							state={{
								parentFolderId: props.state.parentFolderId,
								breadcrumbs: folders.data?.data.breadcrumbs ?? [],
							}}
						/>
					</div>
					<Grid
						state={{
							isLoading: folders.isLoading,
							totalItems: folders.data?.data.folders.length || 0,
						}}
						slots={{
							loadingCard: <MediaFolderCardLoading />,
						}}
						class="border-b border-border pb-4 md:pb-6 mb-4 md:mb-6"
					>
						<For each={folders.data?.data.folders}>
							{(folder) => (
								<MediaFolderCard folder={folder} isDragging={isDragging} />
							)}
						</For>
					</Grid>
				</Show>

				{/* Media */}
				<Show when={!props.state.showingDeleted()}>
					<h3 class="mb-4 ">{T()("media")}</h3>
				</Show>
				<Grid
					state={{
						isLoading: media.isLoading,
						totalItems: media.data?.data.length || 0,
						searchParams: props.state.searchParams,
					}}
					slots={{
						loadingCard: <MediaCardLoading />,
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
		</DynamicContent>
	);
};
