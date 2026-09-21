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
import Button from "@/components/Button/Button";
import ClearProcessedMedia from "@/components/ClearProcessedImagesModal/ClearProcessedImagesModal";
import CopyShareLinkURLModal from "@/components/CopyShareLinkURLModal/CopyShareLinkURLModal";
import CreateUpdateMediaDrawer from "@/components/CreateUpdateMediaDrawer/CreateUpdateMediaDrawer";
import DeleteAllShareLinksModal from "@/components/DeleteAllShareLinksModal/DeleteAllShareLinksModal";
import DeleteMediaBatchModal from "@/components/DeleteMediaBatchModal/DeleteMediaBatchModal";
import DeleteMediaBatchPermanentlyModal from "@/components/DeleteMediaBatchPermanentlyModal/DeleteMediaBatchPermanentlyModal";
import DeleteMediaFolderModal from "@/components/DeleteMediaFolderModal/DeleteMediaFolderModal";
import DeleteMediaModal from "@/components/DeleteMediaModal/DeleteMediaModal";
import DeleteMediaPermanentlyModal from "@/components/DeleteMediaPermanentlyModal/DeleteMediaPermanentlyModal";
import DownloadMediaModal from "@/components/DownloadMediaModal/DownloadMediaModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import { Grid } from "@/components/Grid/Grid";
import ImageCropEditorModal from "@/components/ImageCropEditorModal/ImageCropEditorModal";
import { MediaBreadcrumbs } from "@/components/MediaBreadcrumbs/MediaBreadcrumbs";
import MediaCard, { MediaCardLoading } from "@/components/MediaCard/MediaCard";
import {
	MediaFolderCard,
	MediaFolderCardLoading,
} from "@/components/MediaFolderCard/MediaFolderCard";
import { MediaSelectionActions } from "@/components/MediaSelectionActions/MediaSelectionActions";
import MoveToFolderModal, {
	type MoveToFolderParams,
} from "@/components/MoveToFolderModal/MoveToFolderModal";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RestoreMediaBatchModal from "@/components/RestoreMediaBatchModal/RestoreMediaBatchModal";
import RestoreMediaModal from "@/components/RestoreMediaModal/RestoreMediaModal";
import UpdateMediaFolderModal from "@/components/UpdateMediaFolderModal/UpdateMediaFolderModal";
import UpsertShareLinkDrawer from "@/components/UpsertShareLinkDrawer/UpsertShareLinkDrawer";
import ViewMediaDrawer from "@/components/ViewMediaDrawer/ViewMediaDrawer";
import ViewShareLinksDrawer from "@/components/ViewShareLinksDrawer/ViewShareLinksDrawer";
import { Permissions } from "@/constants/permissions";
import useMediaAltGeneration from "@/hooks/useMediaAltGeneration/useMediaAltGeneration";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import { useUpdateMedia } from "@/hooks/useUpdateMedia/useUpdateMedia";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import mediaStore from "@/store/mediaStore/mediaStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	type ImageCropProvenance,
	type ImageCropSource,
	resolveStoredImageCropSource,
} from "@/utils/image-crop";
import { getImageMeta as getFileImageMeta } from "@/utils/media-meta";
import { recordToTranslations } from "@/utils/translation-helpers";

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
			download: false,
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
		if (item.type !== "image") return;

		const title = recordToTranslations(
			contentLocaleStore.get.locales,
			item.title,
		);
		const alt = recordToTranslations(contentLocaleStore.get.locales, item.alt);

		mediaAltGeneration.open({
			image: () => ({
				url: item.url,
				filename: item.fileName ?? item.key,
			}),
			media: () => ({
				id: item.id,
				name: title,
				alt,
			}),
			locales: () => contentLocaleStore.get.locales,
			setAlt: async (value) => {
				const nextAlt = typeof value === "function" ? value(alt) : value;

				await updateMediaAlt.action.mutateAsync({
					id: item.id,
					body: {
						alt: nextAlt,
					},
				});
			},
			disabled: () => updateMediaAlt.action.isPending,
		});
	};
	const openQuickCrop = (item: Media) => {
		if (item.type !== "image") return;
		const source = resolveStoredImageCropSource(item);
		rowTarget.setTargetId(item.id);
		setActiveQuickCropSource({
			url: source.source.url,
			name: item.fileName ?? item.key,
			mimeType: source.source.meta.mimeType,
			provenance: {
				origin: item.origin,
			},
			crop: source.crop,
		});
		rowTarget.setTrigger("quickCrop", true);
	};
	const applyQuickCrop = async (
		file: File,
		provenance: ImageCropProvenance,
		state: MediaCropState,
	) => {
		const item = quickCropMedia();
		if (item?.type !== "image") {
			throw new Error(T()("media.crop.source.missing"));
		}

		const imageMeta = await getFileImageMeta(file);
		quickCropUpdateMedia.setTitle(
			recordToTranslations(contentLocaleStore.get.locales, item.title),
		);
		quickCropUpdateMedia.setAlt(
			recordToTranslations(contentLocaleStore.get.locales, item.alt),
		);
		quickCropUpdateMedia.setFolderId(item.folderId ?? null);
		quickCropUpdateMedia.setPublic(item.public);
		quickCropUpdateMedia.setFocalPoint(null);

		const success = await quickCropUpdateMedia.updateMedia(null, null, {
			type: "image",
			...provenance,
			crop: {
				file,
				state,
				imageMeta,
				focalPoint: null,
			},
		});
		if (!success) return false;

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
			actionLabel: T()("media.upload.action"),
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
				actionLabel: T()("media.upload.action"),
			};
		}
		return {
			title: T()("empty.states.media.folder.title"),
			description: T()("empty.states.media.folder.description"),
			actionLabel: T()("media.upload.action"),
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
			<QueryBoundary
				isError={isError()}
				isEmpty={containerEmpty()}
				queryState={props.state.searchParams}
				empty={
					<EmptyState
						title={noEntriesCopy()?.title}
						description={noEntriesCopy()?.description}
						actions={
							createEntryCallback() ? (
								<Button size="sm" onClick={createEntryCallback()}>
									{noEntriesCopy()?.actionLabel ?? T()("actions.create.entry")}
								</Button>
							) : undefined
						}
					/>
				}
				class="flex-1 h-full p-4 md:p-6"
			>
				<DragDropProvider onDragEnd={onDragEnd} onDragStart={onDragStart}>
					<DragDropSensors />
					{/* Folders */}
					<Show when={showFoldersSection()}>
						<MediaBreadcrumbs
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
								/>
							)}
						</For>
					</Grid>
				</DragDropProvider>

				<MediaSelectionActions
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
			</QueryBoundary>
			<PaginatedFooter
				state={{
					searchParams: props.state.searchParams,
					meta: media.data?.meta,
				}}
				options={{
					padding: "24",
				}}
			/>

			{/* Keep dialog focus scopes mounted across empty/result transitions. */}
			<MoveToFolderModal
				state={{
					open: rowTarget.getTriggers().moveToFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("moveToFolder", state);
					},
					params: getMoveModalParams(),
				}}
			/>
			<CreateUpdateMediaDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<ViewMediaDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().view,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("view", state);
					},
					parentFolderId: props.state.parentFolderId,
				}}
			/>
			<UpsertShareLinkDrawer
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
			<ViewShareLinksDrawer
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().viewShareLinks,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("viewShareLinks", state);
					},
				}}
			/>
			<DownloadMediaModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().download,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("download", state);
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
			<DeleteMediaFolderModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deleteFolder,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteFolder", state);
					},
				}}
			/>
			<DeleteMediaModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<DeleteMediaPermanentlyModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deletePermanently,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deletePermanently", state);
					},
				}}
			/>
			<RestoreMediaModal
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
			<DeleteMediaBatchModal
				state={{
					open: rowTarget.getTriggers().deleteBatch,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteBatch", state);
					},
				}}
			/>
			<RestoreMediaBatchModal
				state={{
					open: rowTarget.getTriggers().restoreBatch,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("restoreBatch", state);
					},
				}}
			/>
			<DeleteMediaBatchPermanentlyModal
				state={{
					open: rowTarget.getTriggers().deleteBatchPermanently,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteBatchPermanently", state);
					},
				}}
			/>
			<CopyShareLinkURLModal
				ids={getCreatedShareLinkIds}
				state={{
					open: rowTarget.getTriggers().copyShareLinkURL,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("copyShareLinkURL", state);
					},
				}}
			/>
			<DeleteAllShareLinksModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().deleteAllShareLinks,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("deleteAllShareLinks", state);
					},
				}}
			/>
			<ImageCropEditorModal
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
