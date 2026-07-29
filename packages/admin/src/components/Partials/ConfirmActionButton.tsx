import {
	type Component,
	createSignal,
	type JSXElement,
	onCleanup,
} from "solid-js";
import T from "@/translations";
import Button from "./Button";

interface ConfirmActionButtonProps {
	children: JSXElement;
	onConfirm: () => void;
	confirmationText?: string;
}

const ConfirmActionButton: Component<ConfirmActionButtonProps> = (props) => {
	// ----------------------------------------
	// State
	const [awaitingConfirmation, setAwaitingConfirmation] = createSignal(false);
	let confirmationTimeout: number | undefined;

	// ----------------------------------------
	// Functions
	const handleClick = () => {
		if (awaitingConfirmation()) {
			if (confirmationTimeout) window.clearTimeout(confirmationTimeout);
			setAwaitingConfirmation(false);
			props.onConfirm();
			return;
		}

		setAwaitingConfirmation(true);
		confirmationTimeout = window.setTimeout(() => {
			setAwaitingConfirmation(false);
		}, 4000);
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		if (confirmationTimeout) window.clearTimeout(confirmationTimeout);
	});

	// ----------------------------------------
	// Render
	return (
		<Button type="button" theme="primary" size="small" onClick={handleClick}>
			{awaitingConfirmation()
				? (props.confirmationText ??
					T()("common.confirmations.click.to.confirm"))
				: props.children}
		</Button>
	);
};

export default ConfirmActionButton;
