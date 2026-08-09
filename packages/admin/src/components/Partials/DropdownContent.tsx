import { DropdownMenu } from "@kobalte/core";
import classNames from "classnames";
import {
	type Component,
	type JSXElement,
	useContext,
	type ValidComponent,
} from "solid-js";
import { PanelLayerContext } from "@/components/Groups/Panel/PanelLayerContext";

interface DropdownContentProps {
	options?: {
		as?: ValidComponent;
		class?: string;
		rounded?: boolean;
		anchorWidth?: boolean;
		maxHeight?: "md";
		noMargin?: boolean;
		raised?: boolean;
		onOpenAutoFocus?: (event: Event) => void;
	};
	children: JSXElement;
}

const DropdownContent: Component<DropdownContentProps> = (props) => {
	// ----------------------------------------
	// Hooks
	const panelLayer = useContext(PanelLayerContext);

	// ----------------------------------------
	// Render
	return (
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				data-panel-ignore
				as={props.options?.as}
				onOpenAutoFocus={props.options?.onOpenAutoFocus}
				class={classNames(
					"bg-dropdown-base border border-border px-2.5 py-2.5 shadow-md animate-animate-dropdown focus:outline-hidden scrollbar",
					{
						"rounded-md": props.options?.rounded,
						"max-h-60 overflow-y-auto": props.options?.maxHeight === "md",
						"mt-2": props.options?.noMargin !== true,
						"z-40": props.options?.raised,
					},
					props.options?.class,
				)}
				style={{
					width: props.options?.anchorWidth
						? "var(--kb-popper-anchor-width)"
						: undefined,
					"z-index": panelLayer ? panelLayer() + 1 : undefined,
				}}
			>
				{props.children}
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	);
};

export default DropdownContent;
