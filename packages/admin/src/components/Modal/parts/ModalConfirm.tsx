import { type Component, type JSXElement, Show } from "solid-js";
import Button, { type ButtonVariant } from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import T from "@/translations";
import { ModalActions } from "./ModalActions";
import { ModalBody } from "./ModalBody";
import { ModalDescription } from "./ModalDescription";
import { ModalFooter } from "./ModalFooter";
import { ModalHeader } from "./ModalHeader";
import { ModalRoot } from "./ModalRoot";
import { ModalTitle } from "./ModalTitle";

export interface ModalConfirmProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	title: string;
	description?: string;
	/** @default "Confirm" */
	confirmLabel?: string;
	/** @default "Cancel" */
	cancelLabel?: string;
	/** @default "danger" */
	confirmVariant?: ButtonVariant;
	onConfirm: () => void;
	onCancel?: () => void;
	/** Spins the confirm button and blocks both actions. */
	loading?: boolean;
	/** Shown in the footer beside the buttons. */
	error?: string;
	/** Sits to the left of the error message, for a secondary control. */
	footerStart?: JSXElement;
	/** Extra content between the header and the footer. */
	children?: JSXElement;
}

/**
 * A yes or no dialog. Reach for Modal.Root and its parts instead when you need
 * more than one action or a layout of your own.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Confirm
 * 		open={open()}
 * 		onOpenChange={setOpen}
 * 		title="Delete user"
 * 		description="This cannot be undone."
 * 		loading={deleteUser.isPending}
 * 		error={deleteUser.errors()?.message}
 * 		onConfirm={() => deleteUser.mutate({ id: id() })}
 * 		onCancel={() => setOpen(false)}
 * 	/>
 * );
 * ```
 */
export const ModalConfirm: Component<ModalConfirmProps> = (props) => {
	// ----------------------------------------
	// Functions
	const handleCancel = () => {
		if (props.onCancel) props.onCancel();
		else props.onOpenChange(false);
	};

	// ----------------------------------------
	// Render
	return (
		<ModalRoot
			role="alertdialog"
			open={props.open}
			onOpenChange={(open) => {
				if (open) props.onOpenChange(true);
				else handleCancel();
			}}
		>
			<ModalHeader>
				<ModalTitle>{props.title}</ModalTitle>
				<Show when={props.description}>
					<ModalDescription>{props.description}</ModalDescription>
				</Show>
			</ModalHeader>
			<Show when={props.children}>
				<ModalBody>{props.children}</ModalBody>
			</Show>
			<ModalFooter>
				<div class="flex min-w-0 items-center gap-2">
					{props.footerStart}
					<ErrorMessage theme="basic" message={props.error} />
				</div>
				<ModalActions>
					<Button
						variant="outline"
						size="md"
						disabled={props.loading}
						onClick={handleCancel}
					>
						{props.cancelLabel ?? T()("common.cancel")}
					</Button>
					<Button
						variant={props.confirmVariant ?? "danger"}
						size="md"
						loading={props.loading}
						onClick={props.onConfirm}
					>
						{props.confirmLabel ?? T()("common.confirm")}
					</Button>
				</ModalActions>
			</ModalFooter>
		</ModalRoot>
	);
};
