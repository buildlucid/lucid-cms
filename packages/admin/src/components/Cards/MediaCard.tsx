import T from "@/translations";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import classNames from "classnames";
import userStore from "@/store/userStore";
import type { MediaResponse } from "@types";
import type useRowTarget from "@/hooks/useRowTarget";
import helpers from "@/utils/helpers";
import AspectRatio from "@/components/Partials/AspectRatio";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import MediaPreview from "@/components/Partials/MediaPreview";
import { Checkbox } from "@/components/Groups/Form";
import mediaStore from "@/store/mediaStore";
import { createDraggable } from "@thisbeyond/solid-dnd";

interface MediaCardProps {
	media: MediaResponse;
	rowTarget: ReturnType<
		typeof useRowTarget<
			| "clear"
			| "delete"
			| "update"
			| "restore"
			| "deletePermanently"
			| "view"
			| "viewShareLinks"
			| "createShareLink"
			| "deleteAllShareLinks"
		>
	>;
	contentLocale?: string;
	showingDeleted?: Accessor<boolean>;
	isDragging: Accessor<boolean>;
}

export const MediaCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background-base border-border border rounded-md"}>
			<AspectRatio ratio="16:9">
				<span class="skeleton block w-full h-full rounded-b-none" />
			</AspectRatio>
			<div class="p-4">
				<span class="skeleton block h-5 w-1/2 mb-2" />
				<span class="skeleton block h-5 w-full" />
			</div>
		</li>
	);
};

const MediaCard: Component<MediaCardProps> = (props) => {
	// ----------------------------------
	// Hooks
	const draggable = createDraggable(`media:${props.media.id}`);

	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission(["update_media"]).all;
	});
	const canReadMedia = createMemo(() => {
		return userStore.get.hasPermission(["read_media"]).all;
	});
	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission(["create_media"]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission(["delete_media"]).all;
	});
	const title = createMemo(() => {
		return helpers.getTranslation(props.media.title, props.contentLocale);
	});
	const alt = createMemo(() => {
		return helpers.getTranslation(props.media.alt, props.contentLocale);
	});
	const isSelected = createMemo(() => {
		return mediaStore.get.selectedMedia.includes(props.media.id);
	});

	// ----------------------------------
	// Return
	return (
		<li
			// @ts-expect-error
			use:draggable
			class={classNames(
				"bg-card-base border-border border rounded-md group overflow-hidden relative",
				{
					"cursor-pointer": hasUpdatePermission() || props.showingDeleted?.(),
				},
			)}
			onClick={() => {
				if (props.isDragging()) return;
				props.rowTarget.setTargetId(props.media.id);
				if (props.showingDeleted?.()) {
					props.rowTarget.setTrigger("view", true);
				} else if (hasUpdatePermission()) {
					props.rowTarget.setTrigger("update", true);
				}
			}}
			onKeyUp={() => {}}
			onKeyDown={() => {}}
			onKeyPress={() => {}}
		>
			<Show when={hasUpdatePermission() && !props.showingDeleted?.()}>
				<div class="absolute top-3 left-3 z-10">
					<Checkbox
						value={isSelected()}
						onChange={() => {
							if (isSelected()) {
								mediaStore.get.removeSelectedMedia(props.media.id);
							} else {
								mediaStore.get.addSelectedMedia(props.media.id);
							}
						}}
						copy={{}}
						noMargin={true}
					/>
				</div>
			</Show>
			<div class="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100">
				<ActionDropdown
					actions={[
						{
							label: T()("preview"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("view", true);
							},
							permission: true,
							hide: !props.showingDeleted?.(),
						},
						{
							label: T()("edit"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("update", true);
							},
							permission: hasUpdatePermission(),
							hide: props.showingDeleted?.(),
						},
						{
							label: T()("restore"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("restore", true);
							},
							permission: hasUpdatePermission(),
							hide: props.showingDeleted?.() === false,
							theme: "primary",
						},
						{
							label: T()("create_share_link"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("createShareLink", true);
							},
							permission: hasCreatePermission(),
							hide: props.showingDeleted?.(),
						},
						{
							label: T()("view_share_links"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("viewShareLinks", true);
							},
							permission: canReadMedia(),
							hide: props.showingDeleted?.(),
						},
						{
							label: T()("delete_share_links"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("deleteAllShareLinks", true);
							},
							permission: hasUpdatePermission(),
							hide: props.showingDeleted?.(),
							theme: "error",
						},
						{
							label: T()("clear_processed"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("clear", true);
							},
							hide: props.media.type !== "image",
							permission: hasUpdatePermission(),
							theme: "error",
						},
						{
							label: T()("delete"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("delete", true);
							},
							permission: hasDeletePermission(),
							hide: props.showingDeleted?.(),
							theme: "error",
						},

						{
							label: T()("delete_permanently"),
							type: "button",
							onClick: () => {
								props.rowTarget.setTargetId(props.media.id);
								props.rowTarget.setTrigger("deletePermanently", true);
							},
							permission: hasDeletePermission(),
							hide: props.showingDeleted?.() === false,
							theme: "error",
						},
					]}
					options={{
						border: true,
					}}
				/>
			</div>
			{/* Image */}
			<AspectRatio ratio="16:9" innerClass={"overflow-hidden"}>
				<MediaPreview media={props.media} alt={alt() || title() || ""} />
			</AspectRatio>
			{/* Content */}
			<div class="p-3 border-t border-border">
				<h3 class="mb-0.5 line-clamp-1 text-sm">
					{title() || T()("no_translation")}
				</h3>
				<ClickToCopy
					type="simple"
					text={props.media.key}
					value={props.media.url}
					class="text-xs"
				/>
			</div>
		</li>
	);
};

export default MediaCard;
