import T from "@/translations";
import { type Component, Show } from "solid-js";
import { FaSolidXmark } from "solid-icons/fa";
import { AlertDialog } from "@kobalte/core";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";

export const Confirmation: Component<{
	theme?: "primary" | "danger";
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
		isLoading?: boolean;
		isError?: boolean;
	};
	copy: {
		title: string;
		description?: string;
		error?: string;
	};
	callbacks: {
		onConfirm: () => void;
		onCancel: () => void;
	};
}> = (props) => {
	// ------------------------------
	// Render
	return (
		<AlertDialog.Root
			open={props.state.open}
			onOpenChange={() => {
				const targetState = !props.state.open;
				props.state.setOpen(targetState);
				if (!targetState && props.callbacks.onCancel)
					props.callbacks.onCancel();
			}}
		>
			<AlertDialog.Portal>
				<AlertDialog.Overlay class="fixed inset-0 z-40 bg-black/80 animate-animate-overlay-hide cursor-pointer duration-200 transition-colors data-expanded:animate-animate-overlay-show" />
				<div class="fixed inset-0 z-50 flex items-center justify-center p-15 overflow-y-auto">
					<AlertDialog.Content class="z-50 bg-container-3 rounded-xl border-border border max-w-2xl w-full m-auto animate-animate-modal-hide data-expanded:animate-animate-modal-show">
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
						</div>
						<div class="mx-5 py-5 border-t border-border flex flex-wrap items-center gap-2.5 justify-between">
							<div class="flex">
								<Button
									theme={props.theme || "danger"}
									size="small"
									type={"button"}
									loading={props.state.isLoading}
									onClick={props.callbacks.onConfirm}
								>
									{T()("confirm")}
								</Button>
								<Button
									theme="border-outline"
									size="small"
									type={"button"}
									classes="ml-2.5"
									disabled={props.state.isLoading}
									onClick={props.callbacks.onCancel}
								>
									{T()("cancel")}
								</Button>
							</div>
							<Show when={props.state.isError && props.copy.error}>
								<ErrorMessage theme="basic" message={props.copy.error} />
							</Show>
						</div>
					</AlertDialog.Content>
				</div>
			</AlertDialog.Portal>
		</AlertDialog.Root>
	);
};
