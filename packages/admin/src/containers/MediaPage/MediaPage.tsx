import { useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Alert from "@/components/Alert/Alert";
import BulkUploadMediaModal from "@/components/BulkUploadMediaModal/BulkUploadMediaModal";
import ContentLocaleSelect from "@/components/ContentLocaleSelect/ContentLocaleSelect";
import CreateMediaFolderModal from "@/components/CreateMediaFolderModal/CreateMediaFolderModal";
import CreateMenu, {
	type CreateMenuAction,
} from "@/components/CreateMenu/CreateMenu";
import CreateUpdateMediaDrawer from "@/components/CreateUpdateMediaDrawer/CreateUpdateMediaDrawer";
import MediaAltGenerationModal from "@/components/MediaAltGenerationModal/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/MediaImageGenerationModal/MediaImageGenerationModal";
import { MediaList } from "@/components/MediaList/MediaList";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryToolbar from "@/components/QueryToolbar/QueryToolbar";
import { Permissions } from "@/constants/permissions";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts/useKeyboardShortcuts";
import useMediaImageGeneration from "@/hooks/useMediaImageGeneration/useMediaImageGeneration";
import useQueryState, {
	booleanFilter,
	numberFilter,
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import mediaStore from "@/store/mediaStore/mediaStore";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const MediaPage: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				title: textFilter(),
				status: textFilter(),
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
		singleSort: true,
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

	const createActions = createMemo<CreateMenuAction[]>(() => {
		if (!canCreateMedia()) return [];

		const actions: CreateMenuAction[] = [
			{
				type: "button",
				label: T()("media.folders.add"),
				icon: "folder-plus",
				onClick: () => setOpenCreateMediaFolderModal(true),
			},
			{
				type: "button",
				label: T()("media.upload.action"),
				icon: "upload",
				onClick: () => setCreateMediaPanelOpen(true),
			},
		];

		if (aiImageGenerationEnabled()) {
			actions.push({
				type: "button",
				label: T()("ai.media.image.generate.modal.title"),
				icon: "sparkle",
				disabled: aiImageGenerationAccess().disabled,
				disabledToast: aiImageGenerationDisabledToast(),
				onClick: openCreateMediaPanelWithImageGeneration,
			});
		}

		actions.push({
			type: "button",
			label: T()("media.upload.bulk.action"),
			icon: "images",
			onClick: () => setBulkUploadModalOpen(true),
		});

		return actions;
	});

	// ----------------------------------------
	// Shortcuts
	useKeyboardShortcuts({
		newEntry: {
			permission: () => createActions().length > 0,
			callback: () => setOpenCreateMediaFolderModal(true),
		},
	});

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
			<PageLayout.Root>
				<Show when={settings.data?.data?.media?.enabled === false}>
					<Alert variant="warning" appearance="bar">
						{T()("media.storage.adapter.missing.message")}
					</Alert>
				</Show>
				<PageLayout.Header
					title={T()("routes.media.title")}
					description={T()("routes.media.description")}
					actions={
						<>
							<Show when={contentLocaleStore.get.locales.length > 1}>
								<div class="w-full md:max-w-42">
									<ContentLocaleSelect showShortcut={true} />
								</div>
							</Show>
							<CreateMenu actions={createActions()} />
						</>
					}
				>
					<QueryToolbar
						queryState={searchParams}
						showingDeleted={showingDeleted()}
						onShowingDeletedChange={setShowingDeleted}
						onRefresh={() => {
							queryClient.invalidateQueries({
								queryKey: queryKeys.media.lists(),
							});
							queryClient.invalidateQueries({
								queryKey: queryKeys.mediaFolders.list(),
							});
						}}
						filterSubject={T()("routes.media.title")}
						filterFields={[
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
								label: T()("common.status"),
								key: "status",
								type: "select",
								options: [
									{
										label: T()("common.status.ready"),
										value: "ready",
									},
									{
										label: T()("common.status.processing"),
										value: "processing",
									},
									{
										label: T()("common.status.failed"),
										value: "failed",
									},
								],
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
						]}
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
				</PageLayout.Header>
				<PageLayout.Body>
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
					<CreateUpdateMediaDrawer
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
				</PageLayout.Body>
			</PageLayout.Root>
		</section>
	);
};

export default MediaPage;
