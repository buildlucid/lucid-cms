import classNames from "classnames";
import {
	TbOutlineArchive,
	TbOutlineArrowBackUp,
	TbOutlineBan,
	TbOutlineBrush,
	TbOutlineCalendar,
	TbOutlineChartBar,
	TbOutlineCheck,
	TbOutlineCloudOff,
	TbOutlineCopy,
	TbOutlineCrop,
	TbOutlineDownload,
	TbOutlineEye,
	TbOutlineFolderPlus,
	TbOutlineHistory,
	TbOutlineInfoCircle,
	TbOutlineKey,
	TbOutlineLibraryPhoto,
	TbOutlineLink,
	TbOutlineLock,
	TbOutlineMail,
	TbOutlinePencil,
	TbOutlinePhoto,
	TbOutlinePlus,
	TbOutlineRotateClockwise2,
	TbOutlineShare,
	TbOutlineTarget,
	TbOutlineTrash,
	TbOutlineUpload,
	TbOutlineUser,
	TbOutlineUsers,
	TbOutlineWand,
} from "solid-icons/tb";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";

// ----------------------------------------
// Types
export type ActionIconName =
	| "archive"
	| "ban"
	| "broom"
	| "bullseye"
	| "calendar"
	| "chart"
	| "check"
	| "clock"
	| "cloud-off"
	| "copy"
	| "crop"
	| "download"
	| "email"
	| "eye"
	| "folder-plus"
	| "image"
	| "images"
	| "info"
	| "key"
	| "link"
	| "lock"
	| "pen"
	| "plus"
	| "restore"
	| "rotate"
	| "share"
	| "sparkle"
	| "trash"
	| "upload"
	| "user"
	| "users";

interface ActionIconProps {
	icon?: ActionIconName;
	class?: string;
	size?: number;
}

const ActionIcon: Component<ActionIconProps> = (props) => {
	// ----------------------------------------
	// Memos
	const iconClasses = createMemo(() => classNames("shrink-0", props.class));
	const iconSize = createMemo(() => props.size ?? 14);
	const icon = createMemo<JSXElement>(() => {
		switch (props.icon) {
			case "archive":
				return <TbOutlineArchive class={iconClasses()} size={iconSize()} />;
			case "ban":
				return <TbOutlineBan class={iconClasses()} size={iconSize()} />;
			case "broom":
				return <TbOutlineBrush class={iconClasses()} size={iconSize()} />;
			case "bullseye":
				return <TbOutlineTarget class={iconClasses()} size={iconSize()} />;
			case "calendar":
				return <TbOutlineCalendar class={iconClasses()} size={iconSize()} />;
			case "chart":
				return <TbOutlineChartBar class={iconClasses()} size={iconSize()} />;
			case "check":
				return <TbOutlineCheck class={iconClasses()} size={iconSize()} />;
			case "cloud-off":
				return <TbOutlineCloudOff class={iconClasses()} size={iconSize()} />;
			case "clock":
				return <TbOutlineHistory class={iconClasses()} size={iconSize()} />;
			case "copy":
				return <TbOutlineCopy class={iconClasses()} size={iconSize()} />;
			case "crop":
				return <TbOutlineCrop class={iconClasses()} size={iconSize()} />;
			case "download":
				return <TbOutlineDownload class={iconClasses()} size={iconSize()} />;
			case "email":
				return <TbOutlineMail class={iconClasses()} size={iconSize()} />;
			case "eye":
				return <TbOutlineEye class={iconClasses()} size={iconSize()} />;
			case "folder-plus":
				return <TbOutlineFolderPlus class={iconClasses()} size={iconSize()} />;
			case "image":
				return <TbOutlinePhoto class={iconClasses()} size={iconSize()} />;
			case "images":
				return (
					<TbOutlineLibraryPhoto class={iconClasses()} size={iconSize()} />
				);
			case "info":
				return <TbOutlineInfoCircle class={iconClasses()} size={iconSize()} />;
			case "key":
				return <TbOutlineKey class={iconClasses()} size={iconSize()} />;
			case "link":
				return <TbOutlineLink class={iconClasses()} size={iconSize()} />;
			case "lock":
				return <TbOutlineLock class={iconClasses()} size={iconSize()} />;
			case "pen":
				return <TbOutlinePencil class={iconClasses()} size={iconSize()} />;
			case "plus":
				return <TbOutlinePlus class={iconClasses()} size={iconSize()} />;
			case "restore":
				return <TbOutlineArrowBackUp class={iconClasses()} size={iconSize()} />;
			case "rotate":
				return (
					<TbOutlineRotateClockwise2 class={iconClasses()} size={iconSize()} />
				);
			case "share":
				return <TbOutlineShare class={iconClasses()} size={iconSize()} />;
			case "sparkle":
				return <TbOutlineWand class={iconClasses()} size={iconSize()} />;
			case "trash":
				return <TbOutlineTrash class={iconClasses()} size={iconSize()} />;
			case "upload":
				return <TbOutlineUpload class={iconClasses()} size={iconSize()} />;
			case "user":
				return <TbOutlineUser class={iconClasses()} size={iconSize()} />;
			case "users":
				return <TbOutlineUsers class={iconClasses()} size={iconSize()} />;
			default:
				return null;
		}
	});

	// ----------------------------------------
	// Render
	return <Show when={icon()}>{icon()}</Show>;
};

export default ActionIcon;
