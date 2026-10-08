import type { PreviewMode } from "@types";
import type { Component } from "solid-js";
import ActionMenu, {
	type ActionMenuItem,
} from "@/components/ActionMenu/ActionMenu";
import T from "@/translations";

export const DocumentActions: Component<{
	collectionSingularName?: string;
	requestLink?: string;
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
	align?: {
		onAlign: () => void;
		permission: boolean;
		disabled: boolean;
	};
	preview?: {
		onCopy: (mode: PreviewMode) => void;
		permission: boolean;
		loading: boolean;
		scopedOnly: boolean;
	};
}> = (props) => {
	const getActionLabel = (action: string) => {
		if (!props.collectionSingularName) return action;

		return T()("actions.with.collection", {
			action,
			collectionSingle: props.collectionSingularName,
		});
	};

	const actions = (): ActionMenuItem[] => [
		{
			label: T()("requests.view"),
			type: "link",
			icon: "share",
			show: props.requestLink !== undefined,
			href: props.requestLink,
		},
		{
			label: getActionLabel(T()("preview.copy.group")),
			type: "button",
			icon: "link",
			show: props.preview !== undefined && props.preview.scopedOnly === true,
			permission: props.preview?.permission,
			loading: props.preview?.loading,
			onClick: () => props.preview?.onCopy("scoped"),
		},
		{
			label: getActionLabel(T()("preview.copy.group")),
			type: "group",
			icon: "link",
			show: props.preview !== undefined && !props.preview.scopedOnly,
			permission: props.preview?.permission,
			actions: [
				{
					label: getActionLabel(T()("preview.copy.scoped")),
					type: "button",
					icon: "lock",
					permission: props.preview?.permission,
					loading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("scoped"),
				},
				{
					label: getActionLabel(T()("preview.copy.navigable")),
					type: "button",
					icon: "share",
					permission: props.preview?.permission,
					loading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("perspective"),
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

	return <ActionMenu actions={actions()} placement="bottom-end" size="md" />;
};
