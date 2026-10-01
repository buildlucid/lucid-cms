import { createDraggable } from "@thisbeyond/solid-dnd";
import type { Media } from "@types";
import classNames from "classnames";
import { FaSolidGear, FaSolidUserLock } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import ActionMenu, {
	type ActionMenuItem,
} from "@/components/ActionMenu/ActionMenu";
import AspectRatio from "@/components/AspectRatio/AspectRatio";
import Checkbox from "@/components/Checkbox/Checkbox";
import Copy from "@/components/Copy/Copy";
import MediaPreview from "@/components/MediaPreview/MediaPreview";
import { mediaStatusBorderClass } from "@/components/MediaStatusPreview/MediaStatusPreview";
import { Permissions } from "@/constants/permissions";
import type useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import mediaStore from "@/store/mediaStore/mediaStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { AiFeatureAccessState } from "@/utils/ai-feature-access";
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
			| "download"
			| "removeOwnership"
		>
	>;
	contentLocale?: string;
	ownerName?: string;
	showingDeleted?: Accessor<boolean>;
	isDragging: Accessor<boolean>;
	onGenerateAlt?: (_media: Media) => void;
	onCrop?: (_media: Media) => void;
	aiAltAccessState?: AiFeatureAccessState;
	aiAltFeatureEnabled?: boolean;
}

export const MediaCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background border-border border rounded-md"}>
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
			| "deleteAllShareLinks"
			| "download"
			| "removeOwnership",
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
	const ownership = createMemo(() => props.media.ownership);
	const isLibrary = createMemo(() => ownership().type === "library");
	const isOwn = createMemo(() => {
		const current = ownership();
		return current.type === "user" && current.userId === userStore.get.user?.id;
	});
	//* other people's personal media and system media can only be viewed, downloaded or removed here
	const canEdit = createMemo(
		() => hasUpdatePermission() && (isLibrary() || isOwn()),
	);
	const canDelete = createMemo(
		() => hasDeletePermission() && ownership().type !== "system",
	);
	const ownershipLabel = createMemo(() => {
		const current = ownership();
		if (current.type === "system") return T()("media.ownership.system");
		if (current.type !== "user") return undefined;
		if (isOwn()) return T()("media.ownership.yours");
		return props.ownerName
			? T()("media.ownership.owned.by", { name: props.ownerName })
			: T()("media.ownership.user");
	});
	const title = createMemo(() => {
		return helpers.getTranslation(props.media.title, props.contentLocale);
	});
	const displayTitle = createMemo(() => {
		return title() || helpers.formatFileNameTitle(props.media.fileName);
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
			return canEdit() || canDelete();
		}
		return canEdit();
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
			props.media.status === "ready" &&
			props.media.type === "image" &&
			isSupportedCropMimeType(props.media.meta.mimeType) &&
			!props.showingDeleted?.() &&
			props.onCrop !== undefined
		);
	});
	const actionMenuActions = createMemo<ActionMenuItem[]>(() => [
		{
			label: T()("common.preview"),
			type: "button",
			icon: "eye",
			onClick: () => openMediaAction("view"),
			permission: true,
			show: props.showingDeleted?.() === true || !canEdit(),
		},
		{
			label: T()("common.edit"),
			type: "button",
			icon: "pen",
			onClick: () => openMediaAction("update"),
			permission: canEdit(),
			show: !props.showingDeleted?.(),
		},
		{
			label: T()("common.restore"),
			type: "button",
			icon: "restore",
			onClick: () => openMediaAction("restore"),
			permission: canDelete(),
			show: props.showingDeleted?.() !== false,
			variant: "primary",
		},
		{
			label: T()("media.images.action"),
			type: "group",
			icon: "image",
			show:
				props.media.type === "image" &&
				props.media.status === "ready" &&
				canEdit(),
			actions: [
				{
					label: T()("media.crop.action"),
					type: "button",
					icon: "crop",
					onClick: () => {
						props.onCrop?.(props.media);
					},
					permission: hasUpdatePermission(),
					show: showCropAction(),
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
					show:
						props.aiAltFeatureEnabled !== false &&
						props.onGenerateAlt !== undefined &&
						!props.showingDeleted?.() &&
						hasUpdatePermission(),
				},
				{
					label: T()("media.processed.clear.action"),
					type: "button",
					icon: "broom",
					onClick: () => openMediaAction("clear"),
					permission: hasUpdatePermission(),
					variant: "danger",
				},
			],
		},
		{
			label: T()("media.share.links.action"),
			type: "group",
			icon: "link",
			//* personal and system media can't be shared by link
			show:
				!props.showingDeleted?.() &&
				props.media.status === "ready" &&
				isLibrary(),
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
					variant: "danger",
				},
			],
		},
		{
			label: T()("common.download"),
			type: "button",
			icon: "download",
			onClick: () => openMediaAction("download"),
			permission: canReadMedia(),
			show: !props.showingDeleted?.() && props.media.status === "ready",
		},
		{
			label: T()("media.ownership.remove.action"),
			type: "button",
			icon: "user",
			onClick: () => openMediaAction("removeOwnership"),
			permission: hasCreatePermission(),
			show: isOwn() && !props.showingDeleted?.(),
			variant: "danger",
		},
		{
			label: T()("common.delete"),
			type: "button",
			icon: "trash",
			onClick: () => openMediaAction("delete"),
			permission: canDelete(),
			show: !props.showingDeleted?.(),
			variant: "danger",
		},
		{
			label: T()("actions.delete.permanently"),
			type: "button",
			icon: "trash",
			onClick: () => openMediaAction("deletePermanently"),
			permission: canDelete(),
			show: props.showingDeleted?.() !== false,
			variant: "danger",
		},
	]);

	// ----------------------------------
	// Return
	return (
		<li
			// @ts-expect-error
			use:draggable
			class={classNames(
				"bg-card hover:bg-background-hover border rounded-md group overflow-hidden relative transition-colors duration-200",
				mediaStatusBorderClass(props.media.status),
				{
					"cursor-pointer": canEdit() || props.showingDeleted?.(),
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
				if (props.showingDeleted?.() || !canEdit()) {
					props.rowTarget.setTrigger("view", true);
				} else {
					props.rowTarget.setTrigger("update", true);
				}
			}}
			onKeyUp={() => {}}
			onKeyDown={() => {}}
			onKeyPress={() => {}}
		>
			<div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100">
				<ActionMenu actions={actionMenuActions()} placement="bottom-start" />
			</div>
			<Show when={ownershipLabel()}>
				{(label) => (
					<span
						class="absolute top-3 left-3 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-subtitle fill-subtitle shadow-sm"
						role="img"
						aria-label={label()}
						title={`${label()}. ${
							ownership().type === "system"
								? T()("media.ownership.system.description")
								: T()("media.ownership.user.description")
						}`}
					>
						<Show
							when={ownership().type === "system"}
							fallback={<FaSolidUserLock size={11} />}
						>
							<FaSolidGear size={11} />
						</Show>
					</span>
				)}
			</Show>
			{/* Image */}
			<AspectRatio
				ratio="16:9"
				contentClass={classNames("overflow-hidden z-0 bg-card-hover", {
					"rectangle-background":
						props.media.type === "image" ||
						(props.media.type === "video" && props.media.poster),
				})}
			>
				<MediaPreview
					media={{
						status: props.media.status,
						type: props.media.type,
						url: props.media.url,
						delivery: props.media.delivery,
						sources:
							props.media.type === "video" ? props.media.sources : undefined,
						poster:
							props.media.type === "video" ? props.media.poster : undefined,
					}}
					alt={alt() || displayTitle() || ""}
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
								id={`media-card-${props.media.id}`}
								value={isSelected()}
								onChange={() => {
									if (isSelected()) {
										mediaStore.get.removeSelectedMedia(props.media.id);
									} else {
										mediaStore.get.addSelectedMedia(props.media.id);
									}
								}}
							/>
						</div>
					</Show>
					<div class="min-w-0 flex-1">
						<h3 class="mb-0.5 line-clamp-1 text-sm">{displayTitle() || "-"}</h3>
						<Copy.Button
							label={props.media.key}
							value={props.media.url}
							class="text-xs"
						/>
					</div>
				</div>
			</div>
		</li>
	);
};

export default MediaCard;
