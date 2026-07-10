import { useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Alert from "@/components/Blocks/Alert";
import { MediaList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query/Row";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/Modals/AI/MediaImageGenerationModal";
import BulkUploadMediaModal from "@/components/Modals/Media/BulkUploadMedia";
import CreateMediaFolderModal from "@/components/Modals/Media/CreateMediaFolder";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import { Permissions } from "@/constants/permissions";
import useMediaImageGeneration from "@/hooks/ai/useMediaImageGeneration";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";

const MediaListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				title: textFilter(),
				extension: textFilter(),
				type: textFilter(),
				mimeType: textFilter(),
				key: textFilter(),
				public: booleanFilter(),
				origin: textFilter(),
				deletedBy: numberFilter(),
				width: numberFilter(),
				height: numberFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				fileSize: sort(),
				title: sort(),
				width: sort(),
				height: sort(),
				mimeType: sort(),
				extension: sort(),
				createdAt: sort(),
				updatedAt: sort({ defaultValue: "desc" }),
			},
			pagination: pagination({ defaultPerPage: 20 }),
		},
		options: {
			singleSort: true,
		},
	});
	const params = useParams();
	const mediaImageGeneration = useMediaImageGeneration();
	const [getOpenCreateMediaPanel, setOpenCreateMediaPanel] =
		createSignal<boolean>(false);
	const [getOpenCreateMediaFolderModal, setOpenCreateMediaFolderModal] =
		createSignal<boolean>(false);
	const [getOpenBulkUploadModal, setOpenBulkUploadModal] =
		createSignal<boolean>(false);
	const [getOpenImageGenerationOnCreate, setOpenImageGenerationOnCreate] =
		createSignal(false);
	const [getSingleUploadInitialFile, setSingleUploadInitialFile] =
		createSignal<File | null>(null);
	const [getBulkUploadInitialFiles, setBulkUploadInitialFiles] = createSignal<
		File[]
	>([]);
	const [getFileDragDepth, setFileDragDepth] = createSignal(0);
	const [showingDeleted, setShowingDeleted] = createSignal<boolean>(false);

	// ----------------------------------------
	// Memos
	const folderIdFilter = createMemo(() => {
		//* deleted media can have folders, but we dont show them in that context, we just want to list all
		if (showingDeleted()) return undefined;
		//* empty string does a IS NULL filter on this column
		const id = params.folderId;
		if (!id) return "";

		const parsed = Number.parseInt(id, 10);
		return Number.isNaN(parsed) ? "" : parsed;
	});
	const canCreateMedia = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaCreate]).all;
	});
	const aiImageGenerationEnabled = createMemo(() =>
		siteStore.get.isAiFeatureEnabled("imageGeneration"),
	);
	const aiImageGenerationAccess = createMemo(() =>
		mediaImageGeneration.accessState(),
	);
	const aiImageGenerationDisabledToast = createMemo(() => {
		const access = aiImageGenerationAccess();
		if (!access.disabled) return undefined;

		return {
			title: access.title,
			message: access.message,
			status: "warning" as const,
		};
	});
	const canDropFiles = createMemo(() => canCreateMedia() && !showingDeleted());
	const routeFileDragActive = createMemo(
		() => canDropFiles() && getFileDragDepth() > 0,
	);

	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				media: true,
			},
		},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (showingDeleted()) {
			mediaStore.get.reset();
			return;
		}
		searchParams.clearFilter("deletedBy");
	});

	// ----------------------------------------
	// Functions
	const resetCreateMediaPanelIntent = () => {
		setSingleUploadInitialFile(null);
		setOpenImageGenerationOnCreate(false);
	};
	const hasDraggedFiles = (event: DragEvent) => {
		return Array.from(event.dataTransfer?.types ?? []).includes("Files");
	};
	const setCreateMediaPanelOpen = (state: boolean) => {
		if (state) resetCreateMediaPanelIntent();
		if (!state) resetCreateMediaPanelIntent();
		setOpenCreateMediaPanel(state);
	};
	const setBulkUploadModalOpen = (state: boolean) => {
		if (state) setBulkUploadInitialFiles([]);
		if (!state) setBulkUploadInitialFiles([]);
		setOpenBulkUploadModal(state);
	};
	const openSingleUploadWithFile = (file: File) => {
		setOpenImageGenerationOnCreate(false);
		setSingleUploadInitialFile(file);
		setOpenCreateMediaPanel(true);
	};
	const openBulkUploadWithFiles = (files: File[]) => {
		setBulkUploadInitialFiles(files);
		setOpenBulkUploadModal(true);
	};
	const openCreateMediaPanelWithImageGeneration = () => {
		if (!aiImageGenerationEnabled()) return;
		if (aiImageGenerationAccess().disabled) return;
		setSingleUploadInitialFile(null);
		setOpenImageGenerationOnCreate(true);
		setOpenCreateMediaPanel(true);
	};
	const onDragEnter = (event: DragEvent) => {
		if (!canDropFiles() || !hasDraggedFiles(event)) return;
		event.preventDefault();
		setFileDragDepth((depth) => depth + 1);
	};
	const onDragOver = (event: DragEvent) => {
		if (!canDropFiles() || !hasDraggedFiles(event)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	};
	const onDragLeave = (event: DragEvent) => {
		if (!canDropFiles() || !hasDraggedFiles(event)) return;
		event.preventDefault();
		setFileDragDepth((depth) => Math.max(0, depth - 1));
	};
	const onDrop = (event: DragEvent) => {
		if (!canDropFiles() || !hasDraggedFiles(event)) return;
		event.preventDefault();
		setFileDragDepth(0);

		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length === 0) return;
		if (files.length === 1 && files[0]) {
			openSingleUploadWithFile(files[0]);
			return;
		}
		openBulkUploadWithFiles(files);
	};

	// ----------------------------------------
	// Render
	return (
		<section
			aria-label={T()("routes.media.title")}
			class="relative"
			onDragEnter={onDragEnter}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<Show when={routeFileDragActive()}>
				<div class="pointer-events-none fixed inset-0 z-60 flex items-center justify-center bg-overlay-base p-6 backdrop-blur-xs">
					<div class="flex min-h-72 w-full max-w-xl flex-col items-center justify-center rounded-md border-2 border-dashed border-primary-base bg-card-base p-8 text-center shadow-lg">
						<p class="text-base font-semibold text-title">
							{T()("media.upload.drop.title")}
						</p>
						<p class="mt-0.5 max-w-xs text-sm text-body">
							{T()("media.upload.drop.description")}
						</p>
					</div>
				</div>
			</Show>
			<Wrapper
				slots={{
					topBar: (
						<Alert
							style="layout"
							alerts={[
								{
									type: "warning",
									message: T()("media.storage.strategy.missing.message"),
									show: settings.data?.data?.media?.enabled === false,
								},
							]}
						/>
					),
					header: (
						<Standard
							copy={{
								title: T()("routes.media.title"),
								description: T()("routes.media.description"),
							}}
							actions={{
								create: [
									{
										open: getOpenCreateMediaFolderModal(),
										setOpen: setOpenCreateMediaFolderModal,
										permission: canCreateMedia(),
										label: T()("media.folders.add"),
										icon: "folder-plus",
										secondary: true,
									},
									{
										open: getOpenCreateMediaPanel(),
										setOpen: setCreateMediaPanelOpen,
										permission: canCreateMedia(),
										label: T()("media.upload.action"),
										icon: "upload",
									},
									{
										open: getOpenCreateMediaPanel(),
										setOpen: setCreateMediaPanelOpen,
										onClick: openCreateMediaPanelWithImageGeneration,
										permission: canCreateMedia() && aiImageGenerationEnabled(),
										disabled: aiImageGenerationAccess().disabled,
										disabledClickable: true,
										disabledToast: aiImageGenerationDisabledToast(),
										label: T()("ai.media.image.generate.modal.title"),
										icon: "sparkle",
									},
									{
										open: getOpenBulkUploadModal(),
										setOpen: setBulkUploadModalOpen,
										permission: canCreateMedia(),
										label: T()("media.upload.bulk.action"),
										icon: "images",
									},
								],
								contentLocale: true,
							}}
							slots={{
								bottom: (
									<QueryRow
										searchParams={searchParams}
										showingDeleted={showingDeleted}
										setShowingDeleted={setShowingDeleted}
										onRefresh={() => {
											queryClient.invalidateQueries({
												queryKey: ["media.getMultiple"],
											});
											queryClient.invalidateQueries({
												queryKey: ["mediaFolders.getMultiple"],
											});
										}}
										filterSection={{
											subject: T()("routes.media.title"),
											fields: [
												{
													label: T()("common.name"),
													key: "title",
													type: "text",
												},
												{
													label: T()("common.visibility"),
													key: "public",
													type: "checkbox",
													trueLabel: T()("common.public"),
													falseLabel: T()("common.private"),
												},
												{
													label: T()("common.mime.type"),
													key: "mimeType",
													type: "text",
												},
												{
													label: T()("common.key"),
													key: "key",
													type: "text",
												},
												{
													label: T()("common.type"),
													key: "type",
													type: "select",
													options: [
														{
															label: T()("media.types.image"),
															value: "image",
														},
														{
															label: T()("media.types.video"),
															value: "video",
														},
														{
															label: T()("media.types.audio"),
															value: "audio",
														},
														{
															label: T()("media.types.document"),
															value: "document",
														},
														{
															label: T()("media.types.archive"),
															value: "archive",
														},
														{
															label: T()("media.types.unknown"),
															value: "unknown",
														},
													],
												},
												{
													label: T()("common.file.extension"),
													key: "extension",
													type: "text",
												},
												{
													label: T()("common.origin"),
													key: "origin",
													type: "select",
													options: [
														{ label: T()("common.human"), value: "human" },
														{
															label: T()("media.origin.ai.generated"),
															value: "ai_generated",
														},
														{
															label: T()("media.origin.ai.modified"),
															value: "ai_modified",
														},
													],
												},
												{
													label: T()("common.width"),
													key: "width",
													type: "number",
												},
												{
													label: T()("common.height"),
													key: "height",
													type: "number",
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
												...(showingDeleted()
													? [
															{
																label: T()("common.deleted.by"),
																key: "deletedBy",
																type: "user" as const,
															},
														]
													: []),
											],
										}}
										sorts={[
											{
												label: T()("common.title"),
												key: "title",
											},
											{
												label: T()("common.file.size"),
												key: "fileSize",
											},
											{
												label: T()("common.mime.type"),
												key: "mimeType",
											},
											{
												label: T()("common.file.extension"),
												key: "extension",
											},
											{
												label: T()("common.width"),
												key: "width",
											},
											{
												label: T()("common.height"),
												key: "height",
											},
											{
												label: T()("common.created.at"),
												key: "createdAt",
											},
											{
												label: T()("common.updated.at"),
												key: "updatedAt",
											},
										]}
										perPage={[10, 20, 40]}
									/>
								),
							}}
						/>
					),
				}}
			>
				<MediaAltGenerationModal />
				<MediaImageGenerationModal />
				<MediaList
					state={{
						searchParams: searchParams,
						showingDeleted: showingDeleted,
						setOpenCreateMediaPanel: setCreateMediaPanelOpen,
						parentFolderId: folderIdFilter,
					}}
				/>
				<CreateUpdateMediaPanel
					initialFile={getSingleUploadInitialFile}
					openImageGenerationOnCreate={getOpenImageGenerationOnCreate}
					state={{
						open: getOpenCreateMediaPanel(),
						setOpen: setCreateMediaPanelOpen,
						parentFolderId: folderIdFilter,
					}}
					callbacks={{
						onImageGenerationOpened: () => {
							setOpenImageGenerationOnCreate(false);
						},
					}}
				/>
				<BulkUploadMediaModal
					initialFiles={getBulkUploadInitialFiles}
					state={{
						open: getOpenBulkUploadModal(),
						setOpen: setBulkUploadModalOpen,
						parentFolderId: folderIdFilter,
					}}
				/>
				<CreateMediaFolderModal
					state={{
						open: getOpenCreateMediaFolderModal(),
						setOpen: setOpenCreateMediaFolderModal,
						parentFolderId: folderIdFilter,
					}}
				/>
			</Wrapper>
		</section>
	);
};

export default MediaListRoute;
