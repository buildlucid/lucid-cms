import T from "@/translations";
import { type Component, type JSXElement, Show } from "solid-js";
import { FaSolidXmark } from "solid-icons/fa";
import { AlertDialog } from "@kobalte/core";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import classNames from "classnames";

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
	slots?: {
		actionRow?: JSXElement;
	};
	options?: {
		noContent?: boolean;
	};
	children?: JSXElement;
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
				<div class="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
					<AlertDialog.Content class="z-50 bg-background-base rounded-xl border-border border max-w-2xl w-full m-auto animate-animate-modal-hide data-expanded:animate-animate-modal-show">
						<div class="flex items-baseline justify-between mx-4 md:mx-6 py-4 md:py-6">
							<div class="flex flex-col gap-1">
								<AlertDialog.Title>{props.copy.title}</AlertDialog.Title>
								<Show when={props.copy.description}>
									<AlertDialog.Description>
										{props.copy.description}
									</AlertDialog.Description>
								</Show>
							</div>
							<AlertDialog.CloseButton class="text-body hover:text-title ring-error-base focus-visible:ring-1 focus:outline-hidden h-8 w-8 min-w-[32px] rounded-full flex justify-center items-center duration-200 transition-colors">
								<FaSolidXmark class="fill-current" />
							</AlertDialog.CloseButton>
						</div>
						<Show when={props.children}>
							<div class="px-4 md:px-6">{props.children}</div>
						</Show>
						<div
							class={classNames(
								"mx-4 md:mx-6 py-4 md:py-6 flex flex-wrap items-center gap-2 justify-between",
								{
									"!pt-0": !props.children || props.options?.noContent,
								},
							)}
						>
							<div class="flex items-center gap-2">
								<Button
									theme={props.theme || "danger"}
									size="medium"
									type={"button"}
									loading={props.state.isLoading}
									onClick={props.callbacks.onConfirm}
								>
									{T()("confirm")}
								</Button>
								<Button
									theme="border-outline"
									size="medium"
									type={"button"}
									disabled={props.state.isLoading}
									onClick={props.callbacks.onCancel}
								>
									{T()("cancel")}
								</Button>
								<Show when={props.slots?.actionRow}>
									{props.slots?.actionRow}
								</Show>
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
