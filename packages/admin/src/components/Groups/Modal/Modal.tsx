import type { Component, JSXElement } from "solid-js";
import classNames from "classnames";
import { Dialog } from "@kobalte/core";

interface ModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	options?: {
		noPadding?: boolean;
		size?: "large";
	};
	children: JSXElement;
}

export const Modal: Component<ModalProps> = (props) => {
	// ------------------------------
	// Render
	return (
		<Dialog.Root
			open={props.state.open}
			onOpenChange={() => props.state.setOpen(!props.state.open)}
		>
			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-40 bg-black/80 animate-animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-animate-overlay-show" />
				<div class="fixed inset-0 z-50">
					<Dialog.Content class="overflow-y-auto h-full p-4 pointer-events-none! flex items-center justify-center animate-animate-modal-hide data-expanded:animate-animate-modal-show">
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
