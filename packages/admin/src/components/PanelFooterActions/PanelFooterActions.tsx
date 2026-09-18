import type { Component, JSXElement } from "solid-js";
import Button from "@/components/Button/Button";
import { PanelFooter } from "@/components/PanelFooter/PanelFooter";
import T from "@/translations";

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
					variant="outline"
					size="md"
					onClick={props.onClose}
				>
					{props.cancelLabel ?? T()("common.close")}
				</Button>
				<Button
					type="button"
					variant="primary"
					size="md"
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
