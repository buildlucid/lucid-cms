import type { Component, JSXElement } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";
import { PanelFooter } from "./PanelFooter";

interface PanelFooterActionsProps {
	selectedCount: number;
	onClose: () => void;
	onConfirm: () => void;
	confirmDisabled?: boolean;
	cancelLabel?: string;
	startSlot?: JSXElement;
	class?: string;
}

const PanelFooterActions: Component<PanelFooterActionsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<PanelFooter padding="24" class={props.class}>
			<div class="flex flex-wrap items-center gap-3">
				{props.startSlot}
				<p class="text-sm text-subtitle">
					{props.selectedCount} {T()("common.selected").toLowerCase()}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					theme="border-outline"
					size="medium"
					onClick={props.onClose}
				>
					{props.cancelLabel ?? T()("common.close")}
				</Button>
				<Button
					type="button"
					theme="primary"
					size="medium"
					onClick={props.onConfirm}
					disabled={props.confirmDisabled}
				>
					{T()("common.confirm")}
				</Button>
			</div>
		</PanelFooter>
	);
};

export default PanelFooterActions;
