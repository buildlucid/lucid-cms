import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	type JSXElement,
	useContext,
} from "solid-js";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import { usePageScrollPin } from "@/hooks/usePageScrollPin/usePageScrollPin";
import { ModalContext } from "../ModalContext";

export type ModalSize = "sm" | "md" | "lg";

export type ModalRole = "dialog" | "alertdialog";

export interface ModalRootProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** @default "md" */
	size?: ModalSize;
	/** Lets escape and outside clicks close the modal. @default true */
	dismissible?: boolean;
	/** Use "alertdialog" when the user must respond before continuing. @default "dialog" */
	role?: ModalRole;
	/** Set automatically when opened from a drawer or another modal. */
	zIndex?: number;
	/** Applied to the dialog. */
	class?: string;
	children: JSXElement;
}

/** Holds the modal's parts and its open state. */
export const ModalRoot: Component<ModalRootProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const parentLayer = useContext(LayerContext);
	usePageScrollPin(() => props.open);

	// ----------------------------------------
	// Memos
	const dismissible = createMemo(() => props.dismissible !== false);
	const layer = createMemo(
		() => props.zIndex ?? (parentLayer ? parentLayer() + 20 : 50),
	);

	// ----------------------------------------
	// Functions
	const handleOpenChange = (open: boolean) => {
		if (!dismissible() && !open) return;
		props.onOpenChange(open);
	};

	// ----------------------------------------
	// Render
	return (
		<Dialog.Root open={props.open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay
					data-modal-overlay
					class={classNames(
						"fixed inset-0 bg-overlay animate-overlay-hide duration-200 transition-colors data-expanded:animate-overlay-show",
						{
							"cursor-pointer": dismissible(),
						},
					)}
					style={{ "z-index": layer() - 10 }}
				/>
				<div class="fixed inset-0" style={{ "z-index": layer() }}>
					<Dialog.Content
						role={props.role}
						class="overflow-y-auto h-full p-4 pointer-events-none! flex items-center justify-center animate-modal-hide data-expanded:animate-modal-show"
						onEscapeKeyDown={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
						onInteractOutside={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
					>
						<div
							data-modal-content
							class={classNames(
								"w-full bg-background border border-border rounded-xl overflow-hidden m-auto pointer-events-auto",
								{
									"max-w-md": props.size === "sm",
									"max-w-2xl": props.size === undefined || props.size === "md",
									"max-w-7xl": props.size === "lg",
								},
								props.class,
							)}
						>
							<LayerContext.Provider value={layer}>
								<ModalContext.Provider value={{ dismissible }}>
									{props.children}
								</ModalContext.Provider>
							</LayerContext.Provider>
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
