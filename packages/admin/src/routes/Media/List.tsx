import { useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import Alert from "@/components/Blocks/Alert";
import { MediaList } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import { QueryRow } from "@/components/Groups/Query";
import CreateMediaFolderPanel from "@/components/Panels/Media/CreateMediaFolderPanel";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
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
	const [getOpenCreateMediaFolderPanel, setOpenCreateMediaFolderPanel] =
		createSignal<boolean>(false);
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

	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (showingDeleted()) {
			mediaStore.get.reset();
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("media_support_config_stategy_error"),
								show: settings.data?.data.media.enabled === false,
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
									open: getOpenCreateMediaFolderPanel(),
									setOpen: setOpenCreateMediaFolderPanel,
									permission: userStore.get.hasPermission(["create_media"]).all,
									label: T()("add_folder"),
									secondary: true,
								},
								{
									open: getOpenCreateMediaPanel(),
									setOpen: setOpenCreateMediaPanel,
									permission: userStore.get.hasPermission(["create_media"]).all,
									label: T()("upload_media"),
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
					setOpenCreateMediaPanel: setOpenCreateMediaPanel,
					parentFolderId: folderIdFilter,
				}}
			/>
			<CreateUpdateMediaPanel
				state={{
					open: getOpenCreateMediaPanel(),
					setOpen: setOpenCreateMediaPanel,
					parentFolderId: folderIdFilter,
				}}
			/>
			<CreateMediaFolderPanel
				state={{
					open: getOpenCreateMediaFolderPanel(),
					setOpen: setOpenCreateMediaFolderPanel,
					parentFolderId: folderIdFilter,
				}}
			/>
		</Wrapper>
	);
};

export default MediaListRoute;
