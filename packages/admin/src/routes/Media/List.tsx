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
import { QueryRow } from "@/components/Groups/Query";
import BulkUploadMediaModal from "@/components/Modals/Media/BulkUploadMedia";
import CreateMediaFolderModal from "@/components/Modals/Media/CreateMediaFolder";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import { Permissions } from "@/constants/permissions";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import api from "@/services/api";
import mediaStore from "@/store/mediaStore";
import userStore from "@/store/userStore";
import T from "@/translations";

const MediaListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const queryClient = useQueryClient();
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				title: {
					value: "",
					type: "text",
				},
				extension: {
					value: "",
					type: "text",
				},
				type: {
					value: "",
					type: "array",
				},
				mimeType: {
					value: "",
					type: "text",
				},
				key: {
					value: "",
					type: "text",
				},
				public: {
					value: undefined,
					type: "boolean",
				},
			},
			sorts: {
				fileSize: undefined,
				title: undefined,
				width: undefined,
				height: undefined,
				mimeType: undefined,
				extension: undefined,
				createdAt: undefined,
				updatedAt: "desc",
			},
			pagination: {
				perPage: 20,
			},
		},
		{
			singleSort: true,
		},
	);
	const params = useParams();
	const [getOpenCreateMediaPanel, setOpenCreateMediaPanel] =
		createSignal<boolean>(false);
	const [getOpenCreateMediaFolderModal, setOpenCreateMediaFolderModal] =
		createSignal<boolean>(false);
	const [getOpenBulkUploadModal, setOpenBulkUploadModal] =
		createSignal<boolean>(false);
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
		}
	});

	// ----------------------------------------
	// Functions
	const hasDraggedFiles = (event: DragEvent) => {
		return Array.from(event.dataTransfer?.types ?? []).includes("Files");
	};
	const setCreateMediaPanelOpen = (state: boolean) => {
		if (state) setSingleUploadInitialFile(null);
		if (!state) setSingleUploadInitialFile(null);
		setOpenCreateMediaPanel(state);
	};
	const setBulkUploadModalOpen = (state: boolean) => {
		if (state) setBulkUploadInitialFiles([]);
		if (!state) setBulkUploadInitialFiles([]);
		setOpenBulkUploadModal(state);
	};
	const openSingleUploadWithFile = (file: File) => {
		setSingleUploadInitialFile(file);
		setOpenCreateMediaPanel(true);
	};
	const openBulkUploadWithFiles = (files: File[]) => {
		setBulkUploadInitialFiles(files);
		setOpenBulkUploadModal(true);
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
			aria-label={T()("media_route_title")}
			class="relative"
			onDragEnter={onDragEnter}
			onDragOver={onDragOver}
			onDragLeave={onDragLeave}
			onDrop={onDrop}
		>
			<Show when={routeFileDragActive()}>
				<div class="pointer-events-none fixed inset-0 z-60 flex items-center justify-center bg-background-base/80 p-6 backdrop-blur-xs">
					<div class="flex min-h-72 w-full max-w-xl flex-col items-center justify-center rounded-md border-2 border-dashed border-primary-base bg-card-base p-8 text-center shadow-lg">
						<p class="text-base font-semibold text-title">
							{T()("drop_media_to_upload")}
						</p>
						<p class="mt-0.5 max-w-xs text-sm text-body">
							{T()("drop_media_to_upload_description")}
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
									message: T()("media_support_config_stategy_error"),
									show: settings.data?.data?.media?.enabled === false,
								},
							]}
						/>
					),
					header: (
						<Standard
							copy={{
								title: T()("media_route_title"),
								description: T()("media_route_description"),
							}}
							actions={{
								create: [
									{
										open: getOpenCreateMediaFolderModal(),
										setOpen: setOpenCreateMediaFolderModal,
										permission: canCreateMedia(),
										label: T()("add_folder"),
										secondary: true,
									},
									{
										open: getOpenCreateMediaPanel(),
										setOpen: setCreateMediaPanelOpen,
										permission: canCreateMedia(),
										label: T()("upload_media"),
									},
									{
										open: getOpenBulkUploadModal(),
										setOpen: setBulkUploadModalOpen,
										permission: canCreateMedia(),
										label: T()("bulk_upload"),
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
										filters={[
											{
												label: T()("title"),
												key: "title",
												type: "text",
											},
											{
												label: T()("visibility"),
												key: "public",
												type: "boolean",
												trueLabel: T()("public"),
												falseLabel: T()("private"),
											},
											{
												label: T()("mime_type"),
												key: "mimeType",
												type: "text",
											},
											{
												label: T()("key"),
												key: "key",
												type: "text",
											},
											{
												label: T()("type"),
												key: "type",
												type: "multi-select",
												options: [
													{
														label: T()("image"),
														value: "image",
													},
													{
														label: T()("video"),
														value: "video",
													},
													{
														label: T()("audio"),
														value: "audio",
													},
													{
														label: T()("document"),
														value: "document",
													},
													{
														label: T()("archive"),
														value: "archive",
													},
													{
														label: T()("unknown"),
														value: "unknown",
													},
												],
											},
											{
												label: T()("file_extension"),
												key: "extension",
												type: "text",
											},
										]}
										sorts={[
											{
												label: T()("title"),
												key: "title",
											},
											{
												label: T()("file_size"),
												key: "fileSize",
											},
											{
												label: T()("mime_type"),
												key: "mimeType",
											},
											{
												label: T()("file_extension"),
												key: "extension",
											},
											{
												label: T()("width"),
												key: "width",
											},
											{
												label: T()("height"),
												key: "height",
											},
											{
												label: T()("created_at"),
												key: "createdAt",
											},
											{
												label: T()("updated_at"),
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
					state={{
						open: getOpenCreateMediaPanel(),
						setOpen: setCreateMediaPanelOpen,
						parentFolderId: folderIdFilter,
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
