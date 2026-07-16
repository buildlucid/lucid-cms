import type { PreviewMode } from "@types";
import type { Component } from "solid-js";
import ActionMenubar, {
	type ActionMenubarItem,
} from "@/components/Partials/ActionMenubar";
import T from "@/translations";

export const DocumentActions: Component<{
	onDelete?: () => void;
	deletePermission?: boolean;
	preview?: {
		onCopy: (mode: PreviewMode) => void;
		permission: boolean;
		loading: boolean;
		scopedOnly: boolean;
	};
}> = (props) => {
	const actions = (): ActionMenubarItem[] => [
		{
			label: T()("preview.copy.group"),
			type: "button",
			icon: "link",
			hide: props.preview === undefined || props.preview.scopedOnly !== true,
			permission: props.preview?.permission,
			isLoading: props.preview?.loading,
			onClick: () => props.preview?.onCopy("scoped"),
		},
		{
			label: T()("preview.copy.group"),
			type: "group",
			icon: "link",
			hide: props.preview === undefined || props.preview.scopedOnly,
			permission: props.preview?.permission,
			actions: [
				{
					label: T()("preview.copy.scoped"),
					type: "button",
					icon: "lock",
					permission: props.preview?.permission,
					isLoading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("scoped"),
				},
				{
					label: T()("preview.copy.navigable"),
					type: "button",
					icon: "share",
					permission: props.preview?.permission,
					isLoading: props.preview?.loading,
					onClick: () => props.preview?.onCopy("perspective"),
				},
			],
		},
		{
			label: T()("actions.delete.document"),
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
