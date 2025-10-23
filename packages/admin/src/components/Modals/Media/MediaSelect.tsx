import { type Component, createMemo, createSignal, For } from "solid-js";
import MediaBasicCard, {
	MediaBasicCardLoading,
} from "@/components/Cards/MediaBasicCard";
import { Paginated } from "@/components/Groups/Footers";
import { CheckboxButton } from "@/components/Groups/Form/CheckboxButton";
import { Grid } from "@/components/Groups/Grid";
import { DynamicContent } from "@/components/Groups/Layout";
import { Modal } from "@/components/Groups/Modal";
import { Filter, PerPage, Sort } from "@/components/Groups/Query";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import mediaSelectStore from "@/store/forms/mediaSelectStore";
import T from "@/translations";

const MediaSelectModal: Component = () => {
	const open = createMemo(() => mediaSelectStore.get.open);

	// ---------------------------------
	// Render
	return (
		<Modal
			state={{
				open: open(),
				setOpen: () => mediaSelectStore.set("open", false),
			}}
			options={{
				noPadding: true,
				size: "large",
			}}
		>
			<SelectMediaContent />
		</Modal>
	);
};

const SelectMediaContent: Component = () => {
	// ------------------------------
	// Hooks
	const searchParams = useSearchParamsState(
		{
			filters: {
				title: {
					value: "",
					type: "text",
				},
				extension: {
					value: mediaSelectStore.get.extensions || "",
					type: "text",
				},
				type: {
					value: mediaSelectStore.get.type || "",
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
		<div class="min-h-[70vh] flex flex-col">
			{/* Header */}
			<div class="p-4 md:p-6 border-b border-border">
				<h2>{T()("select_media_title")}</h2>
				<p class="mt-1">{T()("select_media_description")}</p>
				<div class="w-full mt-4 flex justify-between">
					<div class="flex gap-2.5">
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
					<div>
						<PerPage options={[10, 20, 40]} searchParams={searchParams} />
					</div>
				</div>
			</div>
			{/* Body */}
			<div class="flex-1 flex w-full flex-col">
				<DynamicContent
					state={{
						isError: media.isError,
						isSuccess: media.isSuccess,
						isEmpty: media.data?.data.length === 0,
						searchParams: searchParams,
					}}
					options={{
						padding: "24",
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
									padding: "24",
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
									current={item.id === mediaSelectStore.get.selected}
									onClick={() => {
										mediaSelectStore.get.onSelectCallback(item);
										mediaSelectStore.set("open", false);
									}}
								/>
							)}
						</For>
					</Grid>
				</DynamicContent>
			</div>
		</div>
	);
};

export default MediaSelectModal;
