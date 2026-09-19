import type { MediaType } from "@types";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import ClearProcessedImagesModal from "@/components/ClearProcessedImagesModal/ClearProcessedImagesModal";
import { Drawer } from "@/components/Drawer/Drawer";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import { FilterSection } from "@/components/FilterSection/FilterSection";
import { FilterSectionToggle } from "@/components/FilterSectionToggle/FilterSectionToggle";
import { Grid } from "@/components/Grid/Grid";
import MediaBasicCard, {
	MediaBasicCardLoading,
} from "@/components/MediaBasicCard/MediaBasicCard";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import { PerPageSelect } from "@/components/PerPageSelect/PerPageSelect";
import { QuerySort } from "@/components/QuerySort/QuerySort";
import { ResetFilters } from "@/components/ResetFilters/ResetFilters";
import RestoreMediaModal from "@/components/RestoreMediaModal/RestoreMediaModal";
import useQueryState, {
	pagination,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import type { MediaDimensionValidation } from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
import T from "@/translations";
import type { MediaRelationRef } from "@/utils/relation-field-helpers";
import { mediaResponseToRef } from "@/utils/relation-field-helpers";
import buildMediaSelectorFilterSchema from "./utils/build-media-selector-filter-schema";

interface MediaSelectPanelProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		zIndex?: number;
		extensions?: string;
		type?: string;
		types?: MediaType[];
		width?: MediaDimensionValidation;
		height?: MediaDimensionValidation;
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

/** Renders the reusable media selector in a bottom panel. */
const MediaSelectDrawer: Component<MediaSelectPanelProps> = (props) => {
	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			side="bottom"
			zIndex={props.state.zIndex}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("media.select.title")}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Body>
				<SelectMediaContent
					extensions={props.state.extensions}
					type={props.state.type}
					types={props.state.types}
					width={props.state.width}
					height={props.state.height}
					multiple={props.state.multiple}
					selected={props.state.selected}
					selectedRefs={props.state.selectedRefs}
					onClose={() => props.state.setOpen(false)}
					onSelect={(selection) => {
						props.callbacks.onSelect(selection);
						props.state.setOpen(false);
					}}
				/>
			</Drawer.Body>
		</Drawer.Root>
	);
};

interface SelectMediaContentProps {
	extensions?: string;
	type?: string;
	types?: MediaType[];
	width?: MediaDimensionValidation;
	height?: MediaDimensionValidation;
	multiple?: boolean;
	selected?: number[];
	selectedRefs?: MediaRelationRef[];
	onClose: () => void;
	onSelect: (selection: { value: number[]; refs: MediaRelationRef[] }) => void;
}

const SelectMediaContent: Component<SelectMediaContentProps> = (props) => {
	// ------------------------------
	// Hooks
	const validationFilterSchema = buildMediaSelectorFilterSchema({
		extensions: props.extensions,
		type: props.type,
		types: props.types,
		width: props.width,
		height: props.height,
	});
	const rowTarget = useRowTarget({
		triggers: {
			restore: false,
			clear: false,
		},
	});
	const searchParams = useQueryState({
		mode: "memory",
		schema: {
			filters: {
				title: textFilter(),
				...validationFilterSchema.filters,
				mimeType: textFilter(),
				key: textFilter(),
				origin: textFilter(),
			},
			defaultOrFilterGroups: validationFilterSchema.defaultOrFilterGroups,
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
	const [showingDeleted, setShowingDeleted] = createSignal<0 | 1>(0);
	const [filterSectionOpen, setFilterSectionOpen] = createSignal(false);
	//* ids drive selection - refs only exist for media picked this session, so
	//* URL-hydrated ids without refs still pre-select their cards
	const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
	const [selectedMedia, setSelectedMedia] = createSignal<MediaRelationRef[]>(
		[],
	);

	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const isMultiple = createMemo(() => props.multiple === true);
	const isShowingDeleted = createMemo(() => showingDeleted() === 1);
	const selectedMediaIds = createMemo(() => selectedIds());

	// ----------------------------------
	// Queries
	const media = api.media.useGetMultiple({
		queryParams: {
			queryString: searchParams.queryString,
			filters: {
				isDeleted: showingDeleted,
				public: 1,
				status: "ready",
			},
		},
	});

	// ----------------------------------
	// Effects
	createEffect(() => {
		const refs = props.selectedRefs ?? [];
		setSelectedIds(props.selected ?? refs.map((media) => media.id));
		setSelectedMedia(refs);
	});

	// ----------------------------------
	// Functions
	const toggleSelectedMedia = (
		mediaItem: Parameters<typeof mediaResponseToRef>[0],
	) => {
		const nextRef = mediaResponseToRef(mediaItem);

		if (selectedIds().includes(nextRef.id)) {
			setSelectedIds((ids) => ids.filter((id) => id !== nextRef.id));
			setSelectedMedia((refs) => refs.filter((ref) => ref.id !== nextRef.id));
			return;
		}
		if (!isMultiple()) {
			setSelectedIds([nextRef.id]);
			setSelectedMedia([nextRef]);
			return;
		}
		setSelectedIds((ids) => [...ids, nextRef.id]);
		setSelectedMedia((refs) => [...refs, nextRef]);
	};
	const confirmSelection = () => {
		props.onSelect({
			value: selectedIds(),
			refs: selectedMedia(),
		});
	};

	// ----------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex gap-2.5 flex-wrap items-center justify-between">
				<div class="flex gap-2.5 flex-wrap items-center">
					<FilterSectionToggle
						open={filterSectionOpen()}
						onToggle={() => setFilterSectionOpen(!filterSectionOpen())}
						searchParams={searchParams}
						active={searchParams.hasFiltersApplied()}
					/>
					<QuerySort
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
						searchParams={searchParams}
					/>
					<Checkbox
						variant="button-secondary"
						id="isDeleted"
						value={showingDeleted() === 1}
						onChange={(value) => {
							setShowingDeleted(value ? 1 : 0);
						}}
						name={"isDeleted"}
						label={T()("media.deleted.show")}
					/>
					<Show when={searchParams.hasFiltersApplied()}>
						<ResetFilters onReset={searchParams.clearFilters} />
					</Show>
				</div>
				<PerPageSelect options={[10, 20, 40]} searchParams={searchParams} />
			</div>

			<FilterSection
				open={filterSectionOpen()}
				setOpen={setFilterSectionOpen}
				subject={T()("common.media")}
				fields={[
					{
						label: T()("common.name"),
						key: "title",
						type: "text",
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
				]}
				searchParams={searchParams}
				embedded={true}
			/>

			<DynamicContent
				class={classNames("grow", {
					"bg-card-base border border-border rounded-md":
						media.data?.data.length === 0,
				})}
				state={{
					isError: media.isError,
					isSuccess: media.isSuccess,
					isEmpty: media.data?.data.length === 0,
					searchParams: searchParams,
				}}
				slot={{
					footer: (
						<PaginatedFooter
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
						title: T()("empty.states.media.title"),
						description: T()("empty.states.media.description"),
					},
				}}
				callback={{
					resetFilters: searchParams.clearFilters,
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

			<Drawer.Footer class="-mx-4 md:-mx-6">
				<div class="flex flex-wrap items-center gap-3">
					<p class="text-sm text-subtitle">
						{selectedMediaIds().length} {T()("common.selected").toLowerCase()}
					</p>
				</div>
				<Drawer.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						onClick={props.onClose}
					>
						{T()("common.close")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={confirmSelection}
					>
						{T()("common.confirm")}
					</Button>
				</Drawer.Actions>
			</Drawer.Footer>

			<ClearProcessedImagesModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().clear,
					setOpen: (open) => rowTarget.setTrigger("clear", open),
				}}
			/>
			<RestoreMediaModal
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().restore,
					setOpen: (open) => rowTarget.setTrigger("restore", open),
				}}
			/>
		</div>
	);
};

export default MediaSelectDrawer;
