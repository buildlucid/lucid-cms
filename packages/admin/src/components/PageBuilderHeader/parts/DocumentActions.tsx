import type { PreviewMode } from "@types";
import type { Component } from "solid-js";
import ActionMenu, {
	type ActionMenuItem,
	type ActionMenuVariant,
} from "@/components/ActionMenu/ActionMenu";
import T from "@/translations";

export const DocumentActions: Component<{
	collectionSingularName?: string;
	/** Auto save's on/off switch, left out without permission to save. */
	autoSave?: {
		enabled: boolean;
		onToggle: () => void;
	};
	/** The published page on the website. */
	liveUrl?: string;
	onDelete?: () => void;
	deletePermission?: boolean;
	unpublish?: {
		onUnpublish: () => void;
		permission: boolean;
	};
	duplicate?: {
		onDuplicate: () => void;
		permission: boolean;
		disabled: boolean;
	};
	export?: {
		onExport: () => void;
		permission: boolean;
	};
	translate?: {
		onTranslate: () => void;
		permission: boolean;
		/** Why translating can't run, eg. without a Lucid connection. The item looks disabled and shows this instead. */
		disabledToast?: { title: string; message: string };
	};
	align?: {
		onAlign: () => void;
		permission: boolean;
		disabled: boolean;
	};
	preview?: {
		onCopy: (mode: PreviewMode) => void;
		/** Stops every preview link shared so far from working, after confirming. */
		onRevoke: () => void;
		permission: boolean;
		revokePermission: boolean;
		loading: boolean;
		scopedOnly: boolean;
	};
	/** @default "outline" */
	variant?: ActionMenuVariant;
	/** Applied to the menu's trigger. */
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const getActionLabel = (action: string) => {
		if (!props.collectionSingularName) return action;

		return T()("actions.with.collection", {
			action,
			collectionSingle: props.collectionSingularName,
		});
	};

	const actions = (): ActionMenuItem[] => [
		{
			label: T()("builder.auto.save.label"),
			type: "checkbox",
			icon: "rotate",
			show: props.autoSave !== undefined,
			checked: props.autoSave?.enabled,
			onClick: props.autoSave?.onToggle,
		},
		{
			label: T()("documents.live.view"),
			type: "link",
			icon: "eye",
			show: props.liveUrl !== undefined,
			href: props.liveUrl,
			target: "_blank",
			rel: "noreferrer",
		},
		{
			label: T()("preview.links.group"),
			type: "group",
			icon: "link",
			show: props.preview !== undefined,
			permission: props.preview?.permission,
			actions: [
				{
					label: T()("preview.links.copy.scoped"),
					type: "button",
					icon: "lock",
					permission: props.preview?.permission,
					loading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("scoped"),
				},
				{
					label: T()("preview.links.copy.navigable"),
					type: "button",
					icon: "share",
					show: props.preview?.scopedOnly === false,
					permission: props.preview?.permission,
					loading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("navigable"),
				},
				{
					label: T()("preview.links.revoke"),
					type: "button",
					icon: "link-off",
					variant: "danger",
					permission: props.preview?.revokePermission,
					onClick: props.preview?.onRevoke,
				},
			],
		},
		{
			label: T()("documents.align.action"),
			type: "button",
			icon: "rotate",
			show: props.align !== undefined,
			permission: props.align?.permission,
			disabled: props.align?.disabled,
			disabledToast: {
				title: T()("toasts.documents.align.disabled.title"),
				message: T()("toasts.documents.align.disabled.message"),
			},
			onClick: props.align?.onAlign,
		},
		{
			label: getActionLabel(T()("common.duplicate")),
			type: "button",
			icon: "copy",
			show: props.duplicate !== undefined,
			permission: props.duplicate?.permission,
			disabled: props.duplicate?.disabled,
			disabledToast: {
				title: T()("toasts.documents.duplicate.disabled.title"),
				message: T()("toasts.documents.duplicate.disabled.message"),
			},
			onClick: props.duplicate?.onDuplicate,
		},
		{
			label: T()("translations.action"),
			type: "button",
			icon: "language",
			show: props.translate !== undefined,
			permission: props.translate?.permission,
			disabled: props.translate?.disabledToast !== undefined,
			disabledToast: props.translate?.disabledToast,
			onClick: props.translate?.onTranslate,
		},
		{
			label: getActionLabel(T()("common.export")),
			type: "button",
			icon: "export",
			show: props.export !== undefined,
			permission: props.export?.permission,
			onClick: props.export?.onExport,
		},
		{
			label: getActionLabel(T()("documents.unpublish.action")),
			type: "button",
			icon: "cloud-off",
			show: props.unpublish !== undefined,
			permission: props.unpublish?.permission,
			onClick: props.unpublish?.onUnpublish,
		},
		{
			label: getActionLabel(T()("common.delete")),
			type: "button",
			icon: "trash",
			show: props.onDelete !== undefined,
			permission: props.deletePermission,
			variant: "danger",
			onClick: props.onDelete,
		},
	];

	// ----------------------------------------
	// Render
	return (
		<ActionMenu
			actions={actions()}
			placement="bottom-end"
			variant={props.variant}
			class={props.class}
		/>
	);
};
