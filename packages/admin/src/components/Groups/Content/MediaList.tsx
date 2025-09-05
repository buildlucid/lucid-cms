import T from "@/translations";
import { type Accessor, type Component, createMemo, For } from "solid-js";
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
import { useParams } from "@solidjs/router";

export const MediaList: Component<{
	state: {
		searchParams: ReturnType<typeof useSearchParamsLocation>;
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

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.getQueryString,
			filters: {
				folderId: props.state.parentFolderId,
			},
			headers: {
				"lucid-content-locale": contentLocale,
			},
		},
		enabled: () => props.state.searchParams.getSettled(),
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: media.isError,
				isSuccess: media.isSuccess,
				isEmpty: media.data?.data.length === 0,
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
			<h3 class="mb-4">{T()("media")}</h3>
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
