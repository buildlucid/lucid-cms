import { type Component, type JSXElement, Show } from "solid-js";
import { FaSolidXmark } from "solid-icons/fa";
import { AlertDialog } from "@kobalte/core";

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
}> = (props) => {
	// ------------------------------
	// Render
	return (
		<AlertDialog.Root
			open={props.state.open}
			onOpenChange={() => props.state.setOpen(!props.state.open)}
		>
			<AlertDialog.Portal>
				<AlertDialog.Overlay class="fixed inset-0 z-40 bg-black/80 animate-animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-animate-overlay-show" />
				<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
					<AlertDialog.Content class="z-50 max-w-2xl w-full bg-container-3 rounded-xl border-border border m-auto animate-animate-modal-hide data-expanded:animate-animate-modal-show">
						<div class="flex items-baseline justify-between mx-5 py-5 border-b border-border">
							<AlertDialog.Title>{props.copy.title}</AlertDialog.Title>
							<AlertDialog.CloseButton class="hover:text-error-contrast ring-error-base focus:ring-1 focus:outline-hidden h-8 w-8 min-w-[32px] rounded-full flex justify-center items-center bg-container-3 hover:bg-error-base duration-200 transition-colors">
								<FaSolidXmark class="fill-current" />
							</AlertDialog.CloseButton>
						</div>
						<div class="p-5">
							<Show when={props.copy.description}>
								<AlertDialog.Description>
									{props.copy.description}
								</AlertDialog.Description>
							</Show>
							<Show when={props.children}>{props.children}</Show>
						</div>
					</AlertDialog.Content>
				</div>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};
