import {
	DragDropProvider,
	DragDropSensors,
	type DragEventHandler,
} from "@thisbeyond/solid-dnd";
import type { Media, MediaCropState } from "@types";
import classNames from "classnames";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import MediaCard, { MediaCardLoading } from "@/components/Cards/MediaCard";
import {
	MediaFolderCard,
	MediaFolderCardLoading,
} from "@/components/Cards/MediaFolderCard";
import { Paginated } from "@/components/Groups/Footers";
import { Grid } from "@/components/Groups/Grid";
import { DynamicContent } from "@/components/Groups/Layout";
import {
	Breadcrumbs,
	SelectedActionPill,
} from "@/components/Groups/MediaLibrary";
import ClearProcessedMedia from "@/components/Modals/Media/ClearProcessedImages";
import CopyShareLinkURL from "@/components/Modals/Media/CopyShareLinkURL";
import DeleteAllShareLinks from "@/components/Modals/Media/DeleteAllShareLinks";
import DeleteMedia from "@/components/Modals/Media/DeleteMedia";
import DeleteMediaBatch from "@/components/Modals/Media/DeleteMediaBatch";
import DeleteMediaBatchPermanently from "@/components/Modals/Media/DeleteMediaBatchPermanently";
import DeleteMediaFolder from "@/components/Modals/Media/DeleteMediaFolder";
import DeleteMediaPermanently from "@/components/Modals/Media/DeleteMediaPermanently";
import ImageCropEditor from "@/components/Modals/Media/ImageCropEditor";
import MoveToFolder, {
	type MoveToFolderParams,
} from "@/components/Modals/Media/MoveToFolder";
import RestoreMedia from "@/components/Modals/Media/RestoreMedia";
import RestoreMediaBatch from "@/components/Modals/Media/RestoreMediaBatch";
import UpdateMediaFolderModal from "@/components/Modals/Media/UpdateMediaFolder";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import UpsertShareLinkPanel from "@/components/Panels/Media/UpsertShareLinkPanel";
import ViewMediaPanel from "@/components/Panels/Media/ViewMediaPanel";
import ViewShareLinksPanel from "@/components/Panels/Media/ViewShareLinksPanel";
import { Permissions } from "@/constants/permissions";
import { useUpdateMedia } from "@/hooks/actions";
import useMediaAltGeneration from "@/hooks/ai/useMediaAltGeneration";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import mediaStore from "@/store/mediaStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import type { ImageCropProvenance, ImageCropSource } from "@/utils/image-crop";
import { getImageMeta as getFileImageMeta } from "@/utils/media-meta";

export const MediaList: Component<{
	state: {
		searchParams: QueryStateResponse;
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
			restoreBatch: false,
			deletePermanently: false,
			deleteBatchPermanently: false,
			deleteBatch: false,
			moveToFolder: false,
			view: false,
			updateFolder: false,
			deleteFolder: false,
			createShareLink: false,
			viewShareLinks: false,
			copyShareLinkURL: false,
			deleteAllShareLinks: false,
			quickCrop: false,
		},
	});
	const mediaAltGeneration = useMediaAltGeneration();
	const quickCropUpdateMedia = useUpdateMedia(rowTarget.getTargetId);
	const [isDragging, setIsDragging] = createSignal(false);
	const [getMoveModalParams, setMoveModalParams] =
		createSignal<MoveToFolderParams>({
			mode: "media",
			itemId: null,
			target: null,
		});
	const [getCreatedShareLinkIds, setCreatedShareLinkIds] =
		createSignal<[number, number]>();
	const [activeQuickCropSource, setActiveQuickCropSource] =
		createSignal<ImageCropSource | null>(null);
	const [quickCropPreviewKeys, setQuickCropPreviewKeys] = createSignal<
		Record<number, number>
	>({});

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
			queryString: props.state.searchParams.queryString,
			filters: {
				folderId: props.state.parentFolderId,
				isDeleted: isDeletedFilter,
			},
		},
		enabled: () => props.state.searchParams.ready(),
	});
	const folders = api.mediaFolders.useGetMultiple({
		queryParams: {
			filters: {
				parentFolderId: props.state.parentFolderId,
			},
			perPage: -1,
		},
	});

	// ----------------------------------
	// Mutations
	const updateMediaAlt = api.media.useUpdateSingle();

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
	const openAltGeneration = (item: Media) => {
		mediaAltGeneration.open({
			image: () => ({
				url: item.url,
				filename: item.fileName ?? item.key,
			}),
			media: () => ({
				id: item.id,
				name: item.title,
				alt: item.alt,
			}),
			locales: () => contentLocaleStore.get.locales,
			setAlt: async (value) => {
				const alt = typeof value === "function" ? value(item.alt ?? []) : value;

				await updateMediaAlt.action.mutateAsync({
					id: item.id,
					body: {
						alt,
					},
				});
			},
			disabled: () => updateMediaAlt.action.isPending,
		});
	};
	const openQuickCrop = (item: Media) => {
		rowTarget.setTargetId(item.id);
		setActiveQuickCropSource({
			url: item.original?.url ?? item.url,
			name: item.fileName ?? item.key,
			mimeType: item.original?.meta.mimeType ?? item.meta.mimeType,
			provenance: {
				origin: item.origin,
			},
			crop: item.crop,
		});
		rowTarget.setTrigger("quickCrop", true);
	};
	const applyQuickCrop = async (
		file: File,
		provenance: ImageCropProvenance,
		state: MediaCropState,
	) => {
		const item = quickCropMedia();
		if (!item) throw new Error(T()("media.crop.source.missing"));

		const imageMeta = await getFileImageMeta(file);
		quickCropUpdateMedia.setTitle(item.title ?? []);
		quickCropUpdateMedia.setAlt(item.alt ?? []);
		quickCropUpdateMedia.setDescription(item.description ?? []);
		quickCropUpdateMedia.setSummary(item.summary ?? []);
		quickCropUpdateMedia.setFolderId(item.folderId ?? null);
		quickCropUpdateMedia.setPublic(item.public);
		quickCropUpdateMedia.setPosterId(item.poster?.id);
		quickCropUpdateMedia.setFocalPoint(null);

		const success = await quickCropUpdateMedia.updateMedia(null, null, {
			...provenance,
			crop: {
				file,
				state,
				imageMeta,
				focalPoint: null,
			},
		});
		if (!success) return false;

		setQuickCropPreviewKeys((keys) => ({
			...keys,
			[item.id]: Date.now(),
		}));
		await media.refetch();
		return undefined;
	};

	// ----------------------------------------
	// Memos
	const foldersCount = createMemo(() => folders.data?.data.folders.length || 0);
	const mediaCount = createMemo(() => media.data?.data.length || 0);
	const quickCropMedia = createMemo(() => {
		return media.data?.data.find((item) => item.id === rowTarget.getTargetId());
	});
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
				title: T()("empty.states.media.deleted.title"),
				description: T()("empty.states.media.deleted.description"),
			};
		}
		return {
			title: T()("empty.states.media.title"),
			description: T()("empty.states.media.description"),
			button: T()("media.upload.action"),
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
				title: T()("empty.states.media.title"),
				description: T()("empty.states.media.description"),
				button: T()("media.upload.action"),
			};
		}
		return {
			title: T()("empty.states.media.folder.title"),
			description: T()("empty.states.media.folder.description"),
			button: T()("media.upload.action"),
		};
	});
	const canRestoreMedia = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaUpdate]).all,
	);
	const canDeleteMedia = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaDelete]).all,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		props.state.showingDeleted();
		mediaStore.get.reset();
	});

	onCleanup(() => {
		mediaStore.get.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<>
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
							isLoading: media.isLoading,
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
									onGenerateAlt={openAltGeneration}
									onCrop={openQuickCrop}
									aiAltAccessState={mediaAltGeneration.accessState()}
									aiAltFeatureEnabled={mediaAltGeneration.isFeatureEnabled()}
									previewCacheKey={
										quickCropPreviewKeys()[item.id] ?? item.updatedAt
									}
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
						restoreAction: () => {
							rowTarget.setTrigger("restoreBatch", true);
						},
						deletePermanentlyAction: () => {
							rowTarget.setTrigger("deleteBatchPermanently", true);
						},
					}}
					options={{
						showingDeleted: props.state.showingDeleted(),
						allowDelete: !props.state.showingDeleted(),
						allowRestore: props.state.showingDeleted() && canRestoreMedia(),
						allowDeletePermanently:
							props.state.showingDeleted() && canDeleteMedia(),
					}}
				/>
			</DynamicContent>

			{/* Keep dialog focus scopes mounted across empty/result transitions. */}
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
			<UpdateMediaFolderModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().updateFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("updateFolder", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<DeleteMediaFolder
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deleteFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteFolder", state);
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
			<RestoreMediaBatch
				state={{
					open: rowTarget.getTriggers().restoreBatch,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("restoreBatch", state);
					},
				}}
			/>
			<DeleteMediaBatchPermanently
				state={{
					open: rowTarget.getTriggers().deleteBatchPermanently,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteBatchPermanently", state);
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
			<ImageCropEditor
				state={{
					open: rowTarget.getTriggers().quickCrop,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("quickCrop", state);
						if (!state) {
							setActiveQuickCropSource(null);
							quickCropUpdateMedia.reset();
						}
					},
				}}
				source={activeQuickCropSource()}
				onApply={applyQuickCrop}
			/>
		</>
	);
};
