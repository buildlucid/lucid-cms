import type { Component } from "solid-js";
import Button from "@/components/Partials/Button";
import T from "@/translations";
import { PanelFooter } from "./PanelFooter";

interface PanelFooterActionsProps {
	selectedCount: number;
	onClose: () => void;
	onConfirm: () => void;
	class?: string;
}

const PanelFooterActions: Component<PanelFooterActionsProps> = (props) => {
	return (
		<PanelFooter padding="24" class={props.class}>
			<p class="text-sm text-subtitle">
				{props.selectedCount} {T()("selected").toLowerCase()}
			</p>
			<div class="flex flex-wrap items-center gap-2">
				<Button
					type="button"
					theme="border-outline"
					size="medium"
					onClick={props.onClose}
				>
					{T()("close")}
				</Button>
				<Button
					type="button"
					theme="primary"
					size="medium"
					onClick={props.onConfirm}
				>
					{T()("confirm")}
				</Button>
			</div>
		</PanelFooter>
	);
};

export default PanelFooterActions;
