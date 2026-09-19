import { Dialog } from "@kobalte/core";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	type JSXElement,
	useContext,
} from "solid-js";
import { LayerContext } from "@/hooks/useLayer/useLayer";
import { ModalContext } from "../ModalContext";

/** Width of the modal surface. */
export type ModalSize = "sm" | "md" | "lg";

/** Use "alertdialog" for interruptions the user has to answer before moving on. */
export type ModalRole = "dialog" | "alertdialog";

export interface ModalRootProps {
	open: boolean;
	onOpenChange: (_open: boolean) => void;
	/** @default "md" */
	size?: ModalSize;
	/** Escape and outside clicks close the modal. @default true */
	dismissible?: boolean;
	/** @default "dialog" */
	role?: ModalRole;
	/** Base stack layer. Modals opened from a panel or another modal infer this. */
	zIndex?: number;
	/** Applied to the modal surface. */
	class?: string;
	children: JSXElement;
}

/**
 * The modal surface and everything around it: the portal, the overlay and the
 * open state. Compose the contents from Modal.Header, Modal.Body and
 * Modal.Footer.
 *
 * @example
 * ```tsx
 * import { Modal } from "@lucidcms/admin/components";
 *
 * return (
 * 	<Modal.Root open={open()} onOpenChange={setOpen}>
 * 		<Modal.Header>
 * 			<Modal.Title>Move media</Modal.Title>
 * 		</Modal.Header>
 * 		<Modal.Body>
 * 			<Select id="folder" value={folder()} onChange={setFolder} options={options()} />
 * 		</Modal.Body>
 * 		<Modal.Footer>
 * 			<Modal.Actions>
 * 				<Button onClick={move}>Move</Button>
 * 			</Modal.Actions>
 * 		</Modal.Footer>
 * 	</Modal.Root>
 * );
 * ```
 */
export const ModalRoot: Component<ModalRootProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const parentLayer = useContext(LayerContext);

	// ----------------------------------------
	// Memos
	const dismissible = createMemo(() => props.dismissible !== false);
	const layer = createMemo(
		() => props.zIndex ?? (parentLayer ? parentLayer() + 20 : 50),
	);

	// ----------------------------------------
	// Functions
	const handleOpenChange = (open: boolean) => {
		if (!dismissible() && !open) return;
		props.onOpenChange(open);
	};

	// ----------------------------------------
	// Render
	return (
		<Dialog.Root open={props.open} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay
					data-modal-overlay
					class={classNames(
						"fixed inset-0 bg-overlay-base animate-overlay-hide duration-200 transition-colors data-expanded:animate-overlay-show",
						{
							"cursor-pointer": dismissible(),
						},
					)}
					style={{ "z-index": layer() - 10 }}
				/>
				<div class="fixed inset-0" style={{ "z-index": layer() }}>
					<Dialog.Content
						role={props.role}
						class="overflow-y-auto h-full p-4 pointer-events-none! flex items-center justify-center animate-modal-hide data-expanded:animate-modal-show"
						onEscapeKeyDown={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
						onInteractOutside={(event) => {
							if (!dismissible()) event.preventDefault();
						}}
					>
						<div
							data-modal-content
							class={classNames(
								"w-full bg-background-base border border-border rounded-xl overflow-hidden m-auto pointer-events-auto",
								{
									"max-w-md": props.size === "sm",
									"max-w-2xl": props.size === undefined || props.size === "md",
									"max-w-7xl": props.size === "lg",
								},
								props.class,
							)}
						>
							<LayerContext.Provider value={layer}>
								<ModalContext.Provider value={{ dismissible }}>
									{props.children}
								</ModalContext.Provider>
							</LayerContext.Provider>
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
