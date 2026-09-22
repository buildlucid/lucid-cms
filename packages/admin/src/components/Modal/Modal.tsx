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
 * A dialog that opens over the page. Use `Modal.Confirm` for a simple confirm
 * or cancel dialog.
 *
 * @example
 * ```tsx
 * import { Button, Input, Modal } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Modal.Root open={open()} onOpenChange={setOpen}>
 * 		<Modal.Header>
 * 			<Modal.Title>{t("redirects.create.title")}</Modal.Title>
 * 		</Modal.Header>
 * 		<Modal.Body>
 * 			<Input id="from" name="from" type="text" label={t("redirects.from")} value={from()} onChange={setFrom} />
 * 		</Modal.Body>
 * 		<Modal.Footer>
 * 			<Modal.Actions>
 * 				<Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
 * 				<Button onClick={create}>{t("common.create")}</Button>
 * 			</Modal.Actions>
 * 		</Modal.Footer>
 * 	</Modal.Root>
 * );
 * ```
 */
const Modal = {
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

export default Modal;
