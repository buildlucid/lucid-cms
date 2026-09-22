import { type Accessor, createContext, useContext } from "solid-js";

interface ModalContextValue {
	dismissible: Accessor<boolean>;
}

export const ModalContext = createContext<ModalContextValue>();

/** Reads the state Modal.Root shares with its parts. */
export const useModalContext = (): ModalContextValue => {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error("Modal parts must be rendered inside <Modal.Root>.");
	}

	return context;
};
