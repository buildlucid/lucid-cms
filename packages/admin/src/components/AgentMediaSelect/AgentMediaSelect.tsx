import type {
	AgentMediaSelectData,
	AgentMediaSelectResponse,
	MediaType,
} from "@types";
import { TbOutlinePhoto, TbOutlineUpload } from "solid-icons/tb";
import { createEffect, createMemo, createSignal, Show } from "solid-js";
import AgentReferenceFiles from "@/components/AgentReferenceFiles/AgentReferenceFiles";
import type { AgentWidgetComponent } from "@/components/AgentWidget/types";
import Button from "@/components/Button/Button";
import MediaSelectDrawer from "@/components/MediaSelectDrawer/MediaSelectDrawer";
import type { AdminOptions } from "@/extensions/types/config";
import useAgentUploads from "@/hooks/useAgentUploads/useAgentUploads";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceKey,
	mergeAgentReferences,
	selectedMediaItems,
} from "@/utils/agent-references";
import { isMediaSelectData } from "@/utils/agent-tools";

//* only these types have a MIME family the file picker can filter by
const acceptedFamilies: ReadonlySet<MediaType> = new Set([
	"image",
	"video",
	"audio",
]);

/** Collects library media or uploads for the widget frame to submit their IDs to `media_select`. */
const AgentMediaSelect: AgentWidgetComponent<AdminOptions | undefined> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	let fileInput: HTMLInputElement | undefined;
	const [selected, setSelected] = createSignal<AgentReferenceItem[]>([]);
	const [drawerOpen, setDrawerOpen] = createSignal(false);
	const [dragDepth, setDragDepth] = createSignal(0);
	const uploads = useAgentUploads({
		agentKey: () => data()?.agentKey,
		onUploaded: (reference) =>
			setSelected((current) =>
				data()?.max === 1
					? [reference]
					: mergeAgentReferences(current, [reference]),
			),
	});

	// ----------------------------------------
	// Memos
	const data = createMemo((): AgentMediaSelectData | undefined =>
		isMediaSelectData(props.data) ? props.data : undefined,
	);
	const active = createMemo(() => props.interaction?.status === "active");
	const canLibrary = createMemo(
		() => userStore.get.hasPermission(["media:read"]).all,
	);
	const canUpload = createMemo(() => active() && data()?.upload === true);
	const mediaIds = createMemo(() =>
		selected().flatMap((reference) =>
			reference.type === "media" ? [reference.mediaId] : [],
		),
	);
	const accept = createMemo(() => {
		const types = data()?.types;
		return types?.every((type) => acceptedFamilies.has(type))
			? types.map((type) => `${type}/*`).join(",")
			: undefined;
	});
	const overLimit = createMemo(() => mediaIds().length > (data()?.max ?? 0));

	// ----------------------------------------
	// Functions
	const hasFiles = (event: DragEvent) =>
		canUpload() &&
		Array.from(event.dataTransfer?.types ?? []).includes("Files");
	const onDragEnter = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		setDragDepth((depth) => depth + 1);
	};
	const onDragOver = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	};
	const onDragLeave = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		setDragDepth((depth) => Math.max(0, depth - 1));
	};
	const onDrop = (event: DragEvent) => {
		if (!hasFiles(event)) return;
		event.preventDefault();
		setDragDepth(0);
		uploads.add(Array.from(event.dataTransfer?.files ?? []));
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const interaction = props.interaction;
		if (interaction?.status !== "active") return;

		interaction.setResponse(
			mediaIds().length > 0 && !overLimit() && !uploads.uploading()
				? ({ mediaIds: mediaIds() } satisfies AgentMediaSelectResponse)
				: undefined,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Show
			when={data()}
			fallback={
				<p class="text-sm text-muted">{T()("agent.widget.unavailable")}</p>
			}
		>
			{(data) => (
				// biome-ignore lint/a11y/noStaticElementInteractions: files can also be picked with the upload button
				<div
					class="relative"
					onDragEnter={onDragEnter}
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
				>
					<input
						ref={fileInput}
						type="file"
						multiple={data().max > 1}
						accept={accept()}
						class="hidden"
						tabIndex={-1}
						aria-hidden="true"
						onChange={(event) => {
							uploads.add(Array.from(event.currentTarget.files ?? []));
							event.currentTarget.value = "";
						}}
					/>
					<Show when={dragDepth() > 0}>
						<div class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-card/90 text-sm font-medium text-title">
							{T()("agent.media.select.drop")}
						</div>
					</Show>
					<AgentReferenceFiles
						references={selected()}
						uploads={uploads.uploads()}
						onRemoveUpload={(upload) => uploads.remove(upload.id)}
						class="-mx-4 -mt-3"
						onRemove={
							active()
								? (removed) =>
										setSelected((current) =>
											current.filter(
												(reference) =>
													agentReferenceKey(reference) !==
													agentReferenceKey(removed),
											),
										)
								: undefined
						}
					/>
					<div class="flex flex-wrap items-center gap-2">
						<Show when={canLibrary()}>
							<Button
								variant="outline"
								size="sm"
								class="gap-1.5"
								disabled={!active()}
								onClick={() => setDrawerOpen(true)}
							>
								<TbOutlinePhoto size={12} />
								{T()("agent.media.select.library")}
							</Button>
						</Show>
						<Show when={data().upload}>
							<Button
								variant="outline"
								size="sm"
								class="gap-1.5"
								disabled={!canUpload()}
								onClick={() => fileInput?.click()}
							>
								<TbOutlineUpload size={12} />
								{T()("agent.uploads.add")}
							</Button>
						</Show>
						<p
							class="ms-auto text-xs"
							classList={{
								"text-muted": !overLimit(),
								"text-danger": overLimit(),
							}}
						>
							{data().max === 1
								? T()("agent.media.select.limit.one")
								: T()("agent.media.select.limit", { max: data().max })}
						</p>
					</div>
					<Show when={drawerOpen() && canLibrary()}>
						<MediaSelectDrawer
							state={{
								open: true,
								setOpen: setDrawerOpen,
								multiple: data().max > 1,
								publicOnly: false,
								includePersonal: data().includePersonal,
								types: data().types ?? undefined,
								selected: mediaIds(),
							}}
							callbacks={{
								onSelect: (selection) =>
									setSelected((current) =>
										selectedMediaItems(
											current,
											selection,
											contentLocaleStore.get.contentLocale,
										),
									),
							}}
						/>
					</Show>
				</div>
			)}
		</Show>
	);
};

export default AgentMediaSelect;
