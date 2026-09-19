import { ModalActions } from "./parts/ModalActions";
import { ModalBody } from "./parts/ModalBody";
import { ModalCloseButton } from "./parts/ModalCloseButton";
import { ModalConfirm } from "./parts/ModalConfirm";
import { ModalDescription } from "./parts/ModalDescription";
import { ModalFooter } from "./parts/ModalFooter";
import { ModalHeader } from "./parts/ModalHeader";
import { ModalRoot } from "./parts/ModalRoot";
import { ModalTitle } from "./parts/ModalTitle";

export type { ModalActionsProps } from "./parts/ModalActions";
export type {
	ModalBodyPadding,
	ModalBodyProps,
} from "./parts/ModalBody";
export type { ModalCloseButtonProps } from "./parts/ModalCloseButton";
export type { ModalConfirmProps } from "./parts/ModalConfirm";
export type { ModalDescriptionProps } from "./parts/ModalDescription";
export type { ModalFooterProps } from "./parts/ModalFooter";
export type { ModalHeaderProps } from "./parts/ModalHeader";
export type {
	ModalRole,
	ModalRootProps,
	ModalSize,
} from "./parts/ModalRoot";
export type { ModalTitleProps } from "./parts/ModalTitle";

/**
 * A dialog built from composable parts, plus Modal.Confirm for the common yes
 * or no case. Modals opened from a panel or another modal stack automatically.
 *
 * @example
 * ```tsx
 * import { Button, Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Root open={open()} onOpenChange={setOpen}>
 * 		<Modal.Header>
 * 			<Modal.Title>Create folder</Modal.Title>
 * 		</Modal.Header>
 * 		<Modal.Body>
 * 			<Input id="title" name="title" type="text" label="Title" value={title()} onChange={setTitle} />
 * 		</Modal.Body>
 * 		<Modal.Footer>
 * 			<Modal.Actions>
 * 				<Button onClick={create}>Create</Button>
 * 			</Modal.Actions>
 * 		</Modal.Footer>
 * 	</Modal.Root>
 * );
 * ```
 */
export const Modal = {
	Root: ModalRoot,
	Header: ModalHeader,
	Title: ModalTitle,
	Description: ModalDescription,
	CloseButton: ModalCloseButton,
	Body: ModalBody,
	Footer: ModalFooter,
	Actions: ModalActions,
	Confirm: ModalConfirm,
};
