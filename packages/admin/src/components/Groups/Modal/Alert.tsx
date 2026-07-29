import { AlertDialog } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import { type Component, type JSXElement, Show } from "solid-js";
import { ModalFooter } from "./ModalFooter";

export const Alert: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	copy: {
		title: string;
		description?: string;
	};
	children?: JSXElement;
	footer?: JSXElement;
	options?: {
		preventDismiss?: boolean;
	};
}> = (props) => {
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
		<AlertDialog.Root open={props.state.open} onOpenChange={handleOpenChange}>
			<AlertDialog.Portal>
				<AlertDialog.Overlay
					class={classNames(
						"fixed inset-0 z-40 bg-overlay-base animate-animate-overlay-hide duration-200 transition-colors data-expanded:animate-animate-overlay-show",
						{
							"cursor-pointer": !preventDismiss(),
						},
					)}
				/>
				<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
					<AlertDialog.Content
						class="z-50 max-w-2xl w-full overflow-hidden bg-background-base rounded-xl border-border border m-auto animate-animate-modal-hide data-expanded:animate-animate-modal-show"
						onEscapeKeyDown={(event) => {
							if (preventDismiss()) event.preventDefault();
						}}
						onInteractOutside={(event) => {
							if (preventDismiss()) event.preventDefault();
						}}
					>
						<div class="flex justify-between mx-4 md:mx-6 py-4 md:py-6">
							<div>
								<AlertDialog.Title class="text-base font-semibold text-title">
									{props.copy.title}
								</AlertDialog.Title>
								<Show when={props.copy.description}>
									<AlertDialog.Description class="mt-1 text-sm text-body">
										{props.copy.description}
									</AlertDialog.Description>
								</Show>
							</div>
							<Show when={!preventDismiss()}>
								<AlertDialog.CloseButton class="text-body hover:text-title ring-error-base focus-visible:ring-1 focus:outline-hidden h-8 w-8 min-w-8 rounded-full flex justify-center items-center duration-200 transition-colors">
									<FaSolidXmark class="fill-current" />
								</AlertDialog.CloseButton>
							</Show>
						</div>
						<div class="px-4 md:px-6 pb-4 md:pb-6">
							<Show when={props.children}>{props.children}</Show>
						</div>
						<Show when={props.footer}>
							<ModalFooter>{props.footer}</ModalFooter>
						</Show>
					</AlertDialog.Content>
				</div>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};
