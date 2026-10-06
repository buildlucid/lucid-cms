import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import {
	type Component,
	children,
	createMemo,
	type JSXElement,
	Show,
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
	/** Shown above the dialog, such as tabs that switch what it shows. */
	above?: JSXElement;
	/** Applied to the dialog. */
	class?: string;
	children: JSXElement;
}

export const ModalRoot: Component<ModalRootProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const parentLayer = useContext(LayerContext);
	usePageScrollPin(() => props.open);

	// ----------------------------------------
	// Memos
	const above = children(() => props.above);
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
						class="overflow-y-auto h-full p-4 pointer-events-none! flex items-center justify-center outline-hidden animate-modal-hide data-expanded:animate-modal-show"
						onEscapeKeyDown={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
						onInteractOutside={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
					>
						<div
							class={classNames("w-full m-auto flex flex-col gap-3", {
								"max-w-md": props.size === "sm",
								"max-w-2xl": props.size === undefined || props.size === "md",
								"max-w-7xl": props.size === "lg",
							})}
						>
							<LayerContext.Provider value={layer}>
								<ModalContext.Provider value={{ dismissible }}>
									<Show when={above()}>
										<div class="pointer-events-auto">{above()}</div>
									</Show>
									<div
										data-modal-content
										class={classNames(
											"w-full bg-background border border-border rounded-xl overflow-hidden pointer-events-auto",
											props.class,
										)}
									>
										{props.children}
									</div>
								</ModalContext.Provider>
							</LayerContext.Provider>
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
