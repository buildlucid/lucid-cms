import classNames from "classnames";
import {
	FaSolidBan,
	FaSolidBroom,
	FaSolidCalendar,
	FaSolidCheck,
	FaSolidCircleInfo,
	FaSolidClockRotateLeft,
	FaSolidEnvelope,
	FaSolidEye,
	FaSolidFolderPlus,
	FaSolidImage,
	FaSolidImages,
	FaSolidKey,
	FaSolidLink,
	FaSolidLock,
	FaSolidPen,
	FaSolidPlus,
	FaSolidRotate,
	FaSolidShare,
	FaSolidTrash,
	FaSolidUndo,
	FaSolidUpload,
	FaSolidUser,
	FaSolidUsers,
	FaSolidWandMagicSparkles,
} from "solid-icons/fa";
import { type Component, createMemo, type JSXElement, Show } from "solid-js";

// ----------------------------------------
// Types
export type ActionIconName =
	| "ban"
	| "broom"
	| "calendar"
	| "check"
	| "clock"
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
			case "ban":
				return <FaSolidBan class={iconClasses()} size={iconSize()} />;
			case "broom":
				return <FaSolidBroom class={iconClasses()} size={iconSize()} />;
			case "calendar":
				return <FaSolidCalendar class={iconClasses()} size={iconSize()} />;
			case "check":
				return <FaSolidCheck class={iconClasses()} size={iconSize()} />;
			case "clock":
				return (
					<FaSolidClockRotateLeft class={iconClasses()} size={iconSize()} />
				);
			case "email":
				return <FaSolidEnvelope class={iconClasses()} size={iconSize()} />;
			case "eye":
				return <FaSolidEye class={iconClasses()} size={iconSize()} />;
			case "folder-plus":
				return <FaSolidFolderPlus class={iconClasses()} size={iconSize()} />;
			case "image":
				return <FaSolidImage class={iconClasses()} size={iconSize()} />;
			case "images":
				return <FaSolidImages class={iconClasses()} size={iconSize()} />;
			case "info":
				return <FaSolidCircleInfo class={iconClasses()} size={iconSize()} />;
			case "key":
				return <FaSolidKey class={iconClasses()} size={iconSize()} />;
			case "link":
				return <FaSolidLink class={iconClasses()} size={iconSize()} />;
			case "lock":
				return <FaSolidLock class={iconClasses()} size={iconSize()} />;
			case "pen":
				return <FaSolidPen class={iconClasses()} size={iconSize()} />;
			case "plus":
				return <FaSolidPlus class={iconClasses()} size={iconSize()} />;
			case "restore":
				return <FaSolidUndo class={iconClasses()} size={iconSize()} />;
			case "rotate":
				return <FaSolidRotate class={iconClasses()} size={iconSize()} />;
			case "share":
				return <FaSolidShare class={iconClasses()} size={iconSize()} />;
			case "sparkle":
				return (
					<FaSolidWandMagicSparkles class={iconClasses()} size={iconSize()} />
				);
			case "trash":
				return <FaSolidTrash class={iconClasses()} size={iconSize()} />;
			case "upload":
				return <FaSolidUpload class={iconClasses()} size={iconSize()} />;
			case "user":
				return <FaSolidUser class={iconClasses()} size={iconSize()} />;
			case "users":
				return <FaSolidUsers class={iconClasses()} size={iconSize()} />;
			default:
				return null;
		}
	});

	// ----------------------------------------
	// Render
	return <Show when={icon()}>{icon()}</Show>;
};

export default ActionIcon;
