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
					<AlertDialog.Content class="z-50 max-w-2xl w-full bg-background-base rounded-xl border-border border m-auto animate-animate-modal-hide data-expanded:animate-animate-modal-show">
						<div class="flex justify-between mx-4 md:mx-6 py-4 md:py-6">
							<div>
								<AlertDialog.Title>{props.copy.title}</AlertDialog.Title>
								<Show when={props.copy.description}>
									<AlertDialog.Description class="mt-1">
										{props.copy.description}
									</AlertDialog.Description>
								</Show>
							</div>
							<AlertDialog.CloseButton class="text-body hover:text-title ring-error-base focus-visible:ring-1 focus:outline-hidden h-8 w-8 min-w-[32px] rounded-full flex justify-center items-center duration-200 transition-colors">
								<FaSolidXmark class="fill-current" />
							</AlertDialog.CloseButton>
						</div>
						<div class="px-4 md:px-6 pb-4 md:pb-6">
							<Show when={props.children}>{props.children}</Show>
						</div>
					</AlertDialog.Content>
				</div>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};
