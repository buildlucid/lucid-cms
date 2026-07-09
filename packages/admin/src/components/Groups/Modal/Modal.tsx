import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface ModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	options?: {
		noPadding?: boolean;
		preventDismiss?: boolean;
		size?: "large";
	};
	children: JSXElement;
}

export const Modal: Component<ModalProps> = (props) => {
	// ------------------------------
	// Functions
	const preventDismiss = () => props.options?.preventDismiss === true;
	const handleOpenChange = (open: boolean) => {
		if (preventDismiss() && !open) return;
		props.state.setOpen(open);
	};

	// ------------------------------
	// Render
	return (
		<Dialog.Root open={props.state.open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay
					class={classNames(
						"fixed inset-0 z-40 bg-overlay-base animate-animate-overlay-hide duration-200 transition-colors data-expanded:animate-animate-overlay-show",
						{
							"cursor-pointer": !preventDismiss(),
						},
					)}
				/>
				<div class="fixed inset-0 z-50">
					<Dialog.Content
						class="overflow-y-auto h-full p-4 pointer-events-none! flex items-center justify-center animate-animate-modal-hide data-expanded:animate-animate-modal-show"
						onEscapeKeyDown={(event) => {
							if (preventDismiss()) event.preventDefault();
						}}
						onInteractOutside={(event) => {
							if (preventDismiss()) event.preventDefault();
						}}
					>
						<div
							class={classNames(
								"max-w-2xl w-full bg-background-base rounded-xl overflow-hidden border-border border m-auto pointer-events-auto",
								{
									"max-w-7xl": props.options?.size === "large",
								},
							)}
						>
							<div
								class={classNames({
									"p-4 md:p-6": !props.options?.noPadding,
								})}
							>
								{props.children}
							</div>
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
