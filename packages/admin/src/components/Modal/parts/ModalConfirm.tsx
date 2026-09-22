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
	/** Shows a spinner on the confirm button and disables both buttons. */
	loading?: boolean;
	/** An error message shown in the footer. */
	error?: string;
	/** Content shown at the start of the footer. */
	footerStart?: JSXElement;
	/** Content shown between the header and footer. */
	children?: JSXElement;
}

/**
 * A dialog asking the user to confirm or cancel an action.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Modal.Confirm
 * 		open={open()}
 * 		onOpenChange={setOpen}
 * 		title={t("redirects.delete.title")}
 * 		description={t("redirects.delete.description")}
 * 		confirmLabel={t("common.delete")}
 * 		loading={remove.isPending}
 * 		onConfirm={() => remove.mutate(redirect.id)}
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
