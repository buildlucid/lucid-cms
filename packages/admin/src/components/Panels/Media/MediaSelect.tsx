import type { MediaResponse } from "@lucidcms/core/types";
import classNames from "classnames";
import { type Component, createMemo, createSignal, For } from "solid-js";
import MediaBasicCard, {
	MediaBasicCardLoading,
} from "@/components/Cards/MediaBasicCard";
import { Paginated } from "@/components/Groups/Footers";
import { CheckboxButton } from "@/components/Groups/Form/CheckboxButton";
import { Grid } from "@/components/Groups/Grid";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import { Filter, PerPage, Sort } from "@/components/Groups/Query";
import ClearProcessedImages from "@/components/Modals/Media/ClearProcessedImages";
import RestoreMedia from "@/components/Modals/Media/RestoreMedia";
import useRowTarget from "@/hooks/useRowTarget";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";

interface MediaSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		extensions?: string;
		type?: string;
		selected?: number;
	};
	callbacks: {
		onSelect: (media: MediaResponse) => void;
	};
}

const MediaSelectPanel: Component<MediaSelectPanelProps> = (props) => {
	// ---------------------------------
	// Render
	return (
		<BottomPanel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: false,
				isError: false,
			}}
			options={{
				padding: "24",
				hideFooter: true,
				growContent: true,
			}}
			copy={{
				title: T()("select_media_title"),
				description: T()("select_media_description"),
			}}
		>
			{() => (
				<SelectMediaContent
					extensions={props.state.extensions}
					type={props.state.type}
					selected={props.state.selected}
					onSelect={(media) => {
						props.callbacks.onSelect(media);
						props.state.setOpen(false);
					}}
				/>
			)}
		</BottomPanel>
	);
};

interface SelectMediaContentProps {
	extensions?: string;
	type?: string;
	selected?: number;
	onSelect: (media: MediaResponse) => void;
}

const SelectMediaContent: Component<SelectMediaContentProps> = (props) => {
	// ------------------------------
	// Hooks
	const rowTarget = useRowTarget({
		triggers: {
			restore: false,
			clear: false,
		},
	});
	const searchParams = useSearchParamsState(
		{
			filters: {
				title: {
					value: "",
					type: "text",
				},
				extension: {
					value: props.extensions || "",
					type: "text",
				},
				type: {
					value: props.type || "",
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
	const [showingDeleted, setShowingDeleted] = createSignal<0 | 1>(0);

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const isShowingDeleted = createMemo(() => showingDeleted() === 1);

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: searchParams.getQueryString,
			headers: {
				"lucid-content-locale": contentLocale,
			},
			filters: {
				isDeleted: showingDeleted,
				public: 1,
			},
		},
	});

	// ----------------------------------
	// Render
	return (
		<div class="flex flex-col h-full pb-4">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap">
					<Filter
						filters={[
							{
								label: T()("title"),
								key: "title",
								type: "text",
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
						searchParams={searchParams}
					/>
					<Sort
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
						searchParams={searchParams}
					/>
					<CheckboxButton
						id="isDeleted"
						value={showingDeleted() === 1}
						onChange={(value) => {
							setShowingDeleted(value ? 1 : 0);
						}}
						name={"isDeleted"}
						copy={{
							label: T()("show_deleted"),
						}}
						theme="error"
					/>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<DynamicContent
				class={classNames({
					"bg-card-base border border-border rounded-md":
						media.data?.data.length === 0,
				})}
				state={{
					isError: media.isError,
					isSuccess: media.isSuccess,
					isEmpty: media.data?.data.length === 0,
					searchParams: searchParams,
				}}
				options={{
					padding: media.data?.data.length === 0 ? "16" : undefined,
				}}
				copy={{
					noEntries: {
						title: T()("no_media"),
						description: T()("no_media_description"),
						button: T()("upload_media"),
					},
				}}
				slot={{
					footer: (
						<Paginated
							state={{
								searchParams: searchParams,
								meta: media.data?.meta,
							}}
							options={{
								embedded: true,
							}}
						/>
					),
				}}
			>
				<Grid
					state={{
						isLoading: media.isLoading,
						totalItems: media.data?.data.length || 0,
						searchParams: searchParams,
					}}
					slots={{
						loadingCard: <MediaBasicCardLoading />,
					}}
				>
					<For each={media.data?.data}>
						{(item) => (
							<MediaBasicCard
								media={item}
								contentLocale={contentLocale()}
								current={item.id === props.selected}
								rowTarget={rowTarget}
								showingDeleted={isShowingDeleted}
								onClick={() => props.onSelect(item)}
							/>
						)}
					</For>
				</Grid>
			</DynamicContent>

			{/* Modals */}
			<RestoreMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().restore,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("restore", state);
					},
				}}
			/>
			<ClearProcessedImages
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().clear,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("clear", state);
					},
				}}
			/>
		</div>
	);
};

export default MediaSelectPanel;
