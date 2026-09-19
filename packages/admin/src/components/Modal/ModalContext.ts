import { type Accessor, createContext, useContext } from "solid-js";

interface ModalContextValue {
	/** Whether escape and outside clicks close the modal. */
	dismissible: Accessor<boolean>;
}

export const ModalContext = createContext<ModalContextValue>();

/** Reads the state shared by Modal.Root with its parts. */
export const useModalContext = (): ModalContextValue => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error("Modal parts must be rendered inside <Modal.Root>.");
	}

	return context;
};
