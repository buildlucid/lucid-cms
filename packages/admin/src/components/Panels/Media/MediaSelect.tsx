import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
} from "solid-js";
import MediaBasicCard, {
	MediaBasicCardLoading,
} from "@/components/Cards/MediaBasicCard";
import { Paginated } from "@/components/Groups/Footers";
import { CheckboxButton } from "@/components/Groups/Form/CheckboxButton";
import { Grid } from "@/components/Groups/Grid";
import { DynamicContent } from "@/components/Groups/Layout";
import { BottomPanel } from "@/components/Groups/Panel/BottomPanel";
import PanelFooterActions from "@/components/Groups/Panel/PanelFooterActions";
import { Filter, PerPage, Sort } from "@/components/Groups/Query";
import ClearProcessedImages from "@/components/Modals/Media/ClearProcessedImages";
import RestoreMedia from "@/components/Modals/Media/RestoreMedia";
import useRowTarget from "@/hooks/useRowTarget";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import type { MediaRelationRef } from "@/utils/relation-field-helpers";
import { mediaResponseToRef } from "@/utils/relation-field-helpers";

interface MediaSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		extensions?: string;
		type?: string;
		multiple?: boolean;
		selected?: number[];
		selectedRefs?: MediaRelationRef[];
	};
	callbacks: {
		onSelect: (selection: {
			value: number[];
			refs: MediaRelationRef[];
		}) => void;
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
			}}
		>
			{() => (
				<SelectMediaContent
					extensions={props.state.extensions}
					type={props.state.type}
					multiple={props.state.multiple}
					selected={props.state.selected}
					selectedRefs={props.state.selectedRefs}
					onClose={() => props.state.setOpen(false)}
					onSelect={(selection) => {
						props.callbacks.onSelect(selection);
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
	multiple?: boolean;
	selected?: number[];
	selectedRefs?: MediaRelationRef[];
	onClose: () => void;
	onSelect: (selection: { value: number[]; refs: MediaRelationRef[] }) => void;
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
	const [selectedMedia, setSelectedMedia] = createSignal<MediaRelationRef[]>(
		[],
	);

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const isMultiple = createMemo(() => props.multiple === true);
	const isShowingDeleted = createMemo(() => showingDeleted() === 1);
	const selectedMediaIds = createMemo(() =>
		selectedMedia().map((media) => media.id),
	);

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: searchParams.getQueryString,
			filters: {
				isDeleted: showingDeleted,
				public: 1,
			},
		},
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (!props.selectedRefs) {
			setSelectedMedia([]);
			return;
		}

		setSelectedMedia(props.selectedRefs);
	});

	// ----------------------------------
	// Functions
	const toggleSelectedMedia = (
		mediaItem: Parameters<typeof mediaResponseToRef>[0],
	) => {
		const nextRef = mediaResponseToRef(mediaItem);

		setSelectedMedia((prev) => {
			const exists = prev.some(
				(selectedItem) => selectedItem.id === nextRef.id,
			);
			if (exists) {
				return prev.filter((selectedItem) => selectedItem.id !== nextRef.id);
			}

			if (!isMultiple()) {
				return [nextRef];
			}

			return [...prev, nextRef];
		});
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedMediaIds(),
			refs: selectedMedia(),
		});
	};

	// ----------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
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
						theme="secondary"
						copy={{
							label: T()("show_deleted"),
						}}
					/>
				</div>
				<PerPage options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<DynamicContent
				class="grow"
				state={{
					isError: media.isError,
					isSuccess: media.isSuccess,
					isEmpty: media.data?.data.length === 0,
					searchParams: searchParams,
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
				copy={{
					noEntries: {
						title: T()("no_media"),
						description: T()("no_media_description"),
					},
				}}
			>
				<Grid
					state={{
						isLoading: media.isLoading,
						totalItems: media.data?.data.length || 0,
						searchParams: searchParams,
					}}
				>
					<For each={media.data?.data || []}>
						{(mediaItem) => (
							<MediaBasicCard
								media={mediaItem}
								current={selectedMediaIds().includes(mediaItem.id)}
								selected={selectedMediaIds().includes(mediaItem.id)}
								isSelectable={true}
								contentLocale={contentLocale()}
								rowTarget={rowTarget}
								showingDeleted={isShowingDeleted}
								onClick={() => toggleSelectedMedia(mediaItem)}
								onSelect={() => toggleSelectedMedia(mediaItem)}
							/>
						)}
					</For>
					<For each={Array.from({ length: media.isLoading ? 8 : 0 })}>
						{() => <MediaBasicCardLoading />}
					</For>
				</Grid>
			</DynamicContent>

			<PanelFooterActions
				selectedCount={selectedMediaIds().length}
				onClose={props.onClose}
				onConfirm={confirmSelection}
			/>

			<ClearProcessedImages
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().clear,
					setOpen: (open) => rowTarget.setTrigger("clear", open),
				}}
			/>
			<RestoreMedia
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().restore,
					setOpen: (open) => rowTarget.setTrigger("restore", open),
				}}
			/>
		</div>
	);
};

export default MediaSelectPanel;
