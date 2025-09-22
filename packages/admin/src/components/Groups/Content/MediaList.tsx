import T from "@/translations";
import {
	type Accessor,
	type Component,
	createMemo,
	For,
	onCleanup,
	Show,
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
import {
	MediaFolderCardLoading,
	MediaFolderCard,
} from "@/components/Cards/MediaFolderCard";
import {
	Breadcrumbs,
	SelectedActionPill,
} from "@/components/Groups/MediaLibrary";
import mediaStore from "@/store/mediaStore";

export const MediaList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
		isDeleted: Accessor<boolean>;
		setOpenCreateMediaPanel: (state: boolean) => void;
		parentFolderId: Accessor<number | string>;
	};
}> = (props) => {
	// ----------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			update: false,
			delete: false,
			clear: false,
		},
	});

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const isDeleted = createMemo(() => (props.state.isDeleted() ? 1 : 0));

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
			filters: {
				folderId: props.state.parentFolderId,
				isDeleted: isDeleted,
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
			{/* Folders */}
			<Show when={!props.state.isDeleted()}>
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
						{(folder) => <MediaFolderCard folder={folder} />}
					</For>
				</Grid>
			</Show>

			{/* Media */}
			<Show when={!props.state.isDeleted()}>
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
						/>
					)}
				</For>
			</Grid>

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
					deleteSelectedFolders: () => {},
					deleteSelectedMedia: () => {},
				}}
			/>

			{/* Modals */}
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
			<ClearProcessedMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().clear,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("clear", state);
					},
				}}
			/>
		</DynamicContent>
	);
};
