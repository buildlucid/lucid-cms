import type { PreviewMode } from "@types";
import type { Component } from "solid-js";
import ActionMenubar, {
	type ActionMenubarItem,
} from "@/components/Partials/ActionMenubar";
import T from "@/translations";

export const DocumentActions: Component<{
	collectionSingularName?: string;
	onDelete?: () => void;
	deletePermission?: boolean;
	duplicate?: {
		onDuplicate: () => void;
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

	const actions = (): ActionMenubarItem[] => [
		{
			label: getActionLabel(T()("preview.copy.group")),
			type: "button",
			icon: "link",
			hide: props.preview === undefined || props.preview.scopedOnly !== true,
			permission: props.preview?.permission,
			isLoading: props.preview?.loading,
			onClick: () => props.preview?.onCopy("scoped"),
		},
		{
			label: getActionLabel(T()("preview.copy.group")),
			type: "group",
			icon: "link",
			hide: props.preview === undefined || props.preview.scopedOnly,
			permission: props.preview?.permission,
			actions: [
				{
					label: getActionLabel(T()("preview.copy.scoped")),
					type: "button",
					icon: "lock",
					permission: props.preview?.permission,
					isLoading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("scoped"),
				},
				{
					label: getActionLabel(T()("preview.copy.navigable")),
					type: "button",
					icon: "share",
					permission: props.preview?.permission,
					isLoading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("perspective"),
				},
			],
		},
		{
			label: getActionLabel(T()("common.duplicate")),
			type: "button",
			icon: "copy",
			hide: props.duplicate === undefined,
			permission: props.duplicate?.permission,
			disabled: props.duplicate?.disabled,
			disabledToast: {
				title: T()("toasts.documents.duplicate.disabled.title"),
				message: T()("toasts.documents.duplicate.disabled.message"),
			},
			onClick: props.duplicate?.onDuplicate,
		},
		{
			label: getActionLabel(T()("common.delete")),
			type: "button",
			icon: "trash",
			hide: props.onDelete === undefined,
			permission: props.deletePermission,
			theme: "error",
			onClick: props.onDelete,
		},
	];

	return (
		<ActionMenubar
			actions={actions()}
			options={{ placement: "bottom-end", triggerSize: "medium" }}
		/>
	);
};
