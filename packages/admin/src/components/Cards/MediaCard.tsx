import { createDraggable } from "@thisbeyond/solid-dnd";
import type { Media } from "@types";
import classNames from "classnames";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import { Checkbox } from "@/components/Groups/Form";
import ActionMenubar, {
	type ActionMenubarItem,
} from "@/components/Partials/ActionMenubar";
import AspectRatio from "@/components/Partials/AspectRatio";
import ClickToCopy from "@/components/Partials/ClickToCopy";
import MediaPreview from "@/components/Partials/MediaPreview";
import { Permissions } from "@/constants/permissions";
import type { AiFeatureAccessState } from "@/hooks/ai/access";
import type useRowTarget from "@/hooks/useRowTarget";
import mediaStore from "@/store/mediaStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { isSupportedCropMimeType } from "@/utils/image-crop";

interface MediaCardProps {
	media: Media;
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
	onGenerateAlt?: (_media: Media) => void;
	onCrop?: (_media: Media) => void;
	aiAltAccessState?: AiFeatureAccessState;
	aiAltFeatureEnabled?: boolean;
	previewCacheKey?: string | number | null;
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
	// biome-ignore lint/correctness/noUnusedVariables: it is being used
	const draggable = createDraggable(`media:${props.media.id}`);

	// ----------------------------------
	// Functions
	const openMediaAction = (
		trigger:
			| "clear"
			| "delete"
			| "update"
			| "restore"
			| "deletePermanently"
			| "view"
			| "viewShareLinks"
			| "createShareLink"
			| "deleteAllShareLinks",
	) => {
		props.rowTarget.setTargetId(props.media.id);
		props.rowTarget.setTrigger(trigger, true);
	};

	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaUpdate]).all;
	});
	const canReadMedia = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaRead]).all;
	});
	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaCreate]).all;
	});
	const hasDeletePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.MediaDelete]).all;
	});
	const hasAiAltGeneratePermission = createMemo(() => {
		return userStore.get.hasPermission([Permissions.AiAltGenerate]).all;
	});
	const title = createMemo(() => {
		return helpers.getTranslation(props.media.title, props.contentLocale);
	});
	const displayTitle = createMemo(() => {
		return title() || helpers.formatFileNameTitle(props.media.file.fileName);
	});
	const alt = createMemo(() => {
		if (props.media.type !== "image") return null;
		return helpers.getTranslation(props.media.alt, props.contentLocale);
	});
	const isSelected = createMemo(() => {
		return mediaStore.get.selectedMedia.includes(props.media.id);
	});
	const canSelect = createMemo(() => {
		if (props.showingDeleted?.()) {
			return hasUpdatePermission() || hasDeletePermission();
		}
		return hasUpdatePermission();
	});
	const aiAltAccessDisabledToast = createMemo(() => {
		if (
			props.aiAltAccessState?.disabled !== true ||
			props.aiAltAccessState.reason === "no-permission"
		) {
			return undefined;
		}

		return {
			title: props.aiAltAccessState.title,
			message: props.aiAltAccessState.message,
			status: "warning" as const,
		};
	});
	const showCropAction = createMemo(() => {
		return (
			props.media.type === "image" &&
			isSupportedCropMimeType(props.media.file.meta.mimeType) &&
			!props.showingDeleted?.() &&
			props.onCrop !== undefined
		);
	});
	const actionMenuActions = createMemo<ActionMenubarItem[]>(() => [
		{
			label: T()("common.preview"),
			type: "button",
			icon: "eye",
			onClick: () => openMediaAction("view"),
			permission: true,
			hide: !props.showingDeleted?.(),
		},
		{
			label: T()("common.edit"),
			type: "button",
			icon: "pen",
			onClick: () => openMediaAction("update"),
			permission: hasUpdatePermission(),
			hide: props.showingDeleted?.(),
		},
		{
			label: T()("common.restore"),
			type: "button",
			icon: "restore",
			onClick: () => openMediaAction("restore"),
			permission: hasUpdatePermission(),
			hide: props.showingDeleted?.() === false,
			theme: "primary",
		},
		{
			label: T()("media.images.action"),
			type: "group",
			icon: "image",
			hide: props.media.type !== "image",
			actions: [
				{
					label: T()("media.crop.action"),
					type: "button",
					icon: "crop",
					onClick: () => {
						props.onCrop?.(props.media);
					},
					permission: hasUpdatePermission(),
					hide: !showCropAction(),
				},
				{
					label: T()("ai.media.alt.generate.action"),
					type: "button",
					icon: "sparkle",
					onClick: () => {
						props.onGenerateAlt?.(props.media);
					},
					permission: hasAiAltGeneratePermission(),
					disabled:
						props.aiAltAccessState?.disabled === true &&
						props.aiAltAccessState.reason !== "no-permission",
					disabledToast: aiAltAccessDisabledToast(),
					hide:
						props.aiAltFeatureEnabled === false ||
						!props.onGenerateAlt ||
						props.showingDeleted?.() ||
						!hasUpdatePermission(),
				},
				{
					label: T()("media.processed.clear.action"),
					type: "button",
					icon: "broom",
					onClick: () => openMediaAction("clear"),
					permission: hasUpdatePermission(),
					theme: "error",
				},
			],
		},
		{
			label: T()("media.share.links.action"),
			type: "group",
			icon: "link",
			hide: props.showingDeleted?.(),
			actions: [
				{
					label: T()("media.share.links.create.action"),
					type: "button",
					icon: "plus",
					onClick: () => openMediaAction("createShareLink"),
					permission: hasCreatePermission(),
				},
				{
					label: T()("media.share.links.view.action"),
					type: "button",
					icon: "eye",
					onClick: () => openMediaAction("viewShareLinks"),
					permission: canReadMedia(),
				},
				{
					label: T()("media.share.links.delete.action"),
					type: "button",
					icon: "trash",
					onClick: () => openMediaAction("deleteAllShareLinks"),
					permission: hasUpdatePermission(),
					theme: "error",
				},
			],
		},
		{
			label: T()("common.delete"),
			type: "button",
			icon: "trash",
			onClick: () => openMediaAction("delete"),
			permission: hasDeletePermission(),
			hide: props.showingDeleted?.(),
			theme: "error",
		},
		{
			label: T()("actions.delete.permanently"),
			type: "button",
			icon: "trash",
			onClick: () => openMediaAction("deletePermanently"),
			permission: hasDeletePermission(),
			hide: props.showingDeleted?.() === false,
			theme: "error",
		},
	]);

	// ----------------------------------
	// Return
	return (
		<li
			// @ts-expect-error
			use:draggable
			class={classNames(
				"bg-card-base hover:bg-card-hover border-border border rounded-md group overflow-hidden relative transition-colors duration-200",
				{
					"cursor-pointer": hasUpdatePermission() || props.showingDeleted?.(),
				},
			)}
			onClick={(event) => {
				if (props.isDragging()) return;
				if (event.shiftKey && canSelect()) {
					if (isSelected()) {
						mediaStore.get.removeSelectedMedia(props.media.id);
					} else {
						mediaStore.get.addSelectedMedia(props.media.id);
					}
					return;
				}
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
			<div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100">
				<ActionMenubar
					actions={actionMenuActions()}
					options={{
						border: true,
						placement: "bottom-start",
					}}
				/>
			</div>
			{/* Image */}
			<AspectRatio
				ratio="16:9"
				innerClass={classNames("overflow-hidden z-0 bg-card-hover", {
					"rectangle-background":
						props.media.type === "image" ||
						(props.media.type === "video" && props.media.poster),
				})}
			>
				<MediaPreview
					media={{
						type: props.media.type,
						url: props.media.file.url,
						poster:
							props.media.type === "video" ? props.media.poster : undefined,
						updatedAt: props.media.updatedAt,
					}}
					alt={alt() || displayTitle() || ""}
					cacheKey={props.previewCacheKey ?? props.media.updatedAt}
					imageFit={
						props.media.type === "image" ||
						(props.media.type === "video" && props.media.poster)
							? "contain"
							: undefined
					}
				/>
			</AspectRatio>
			{/* Content */}
			<div class="p-3 border-t border-border">
				<div class="flex items-start gap-3">
					<Show when={canSelect()}>
						{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation */}
						{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation */}
						<div class="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
								fullWidth={false}
							/>
						</div>
					</Show>
					<div class="min-w-0 flex-1">
						<h3 class="mb-0.5 line-clamp-1 text-sm">{displayTitle() || "-"}</h3>
						<ClickToCopy
							type="simple"
							text={props.media.file.key}
							value={props.media.file.url}
							class="text-xs"
						/>
					</div>
				</div>
			</div>
		</li>
	);
};

export default MediaCard;
