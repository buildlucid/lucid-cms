import type { Component } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";

interface PanelFooterActionsProps {
	selectedCount: number;
	onClose: () => void;
	onConfirm: () => void;
	class?: string;
}

const PanelFooterActions: Component<PanelFooterActionsProps> = (props) => {
	return (
		<div
			class={
				props.class ||
				"sticky mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background-base py-4"
			}
		>
			<p class="text-sm text-subtitle">
				{props.selectedCount} {T()("selected").toLowerCase()}
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					theme="border-outline"
					size="small"
					onClick={props.onClose}
				>
					{T()("close")}
				</Button>
				<Button
					type="button"
					theme="primary"
					size="small"
					onClick={props.onConfirm}
				>
					{T()("confirm")}
				</Button>
			</div>
		</div>
	);
};

export default PanelFooterActions;
