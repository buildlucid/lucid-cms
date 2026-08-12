import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

interface ModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	options?: {
		noBorder?: boolean;
		noPadding?: boolean;
		preventDismiss?: boolean;
		size?: "large";
		nested?: boolean;
		/** Content layer. The overlay is placed ten layers below it. */
		zIndex?: number;
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
						"fixed inset-0 bg-overlay-base animate-animate-overlay-hide duration-200 transition-colors data-expanded:animate-animate-overlay-show",
						{
							"cursor-pointer": !preventDismiss(),
							"z-40":
								props.options?.zIndex === undefined &&
								props.options?.nested !== true,
							"z-60":
								props.options?.zIndex === undefined &&
								props.options?.nested === true,
						},
					)}
					style={{
						"z-index":
							props.options?.zIndex !== undefined
								? props.options.zIndex - 10
								: undefined,
					}}
				/>
				<div
					class={classNames("fixed inset-0", {
						"z-50":
							props.options?.zIndex === undefined &&
							props.options?.nested !== true,
						"z-70":
							props.options?.zIndex === undefined &&
							props.options?.nested === true,
					})}
					style={{ "z-index": props.options?.zIndex }}
				>
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
								"max-w-2xl w-full bg-background-base rounded-xl overflow-hidden m-auto pointer-events-auto",
								{
									"border border-border": props.options?.noBorder !== true,
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
