import {
	type Component,
	createSignal,
	type JSXElement,
	onCleanup,
} from "solid-js";
import Button, {
	type ButtonShape,
	type ButtonSize,
	type ButtonVariant,
} from "@/components/Button/Button";
import T from "@/translations";

interface ConfirmActionButtonProps {
	children: JSXElement;
	onConfirm: () => void;
	confirmationText?: string;
	/** @default "primary" */
	variant?: ButtonVariant;
	/** @default "sm" */
	size?: ButtonSize;
	/** Icon buttons widen to fit the confirmation text. @default "standard" */
	shape?: ButtonShape;
	/** Names an icon button, as its tooltip and for screen readers. */
	label?: string;
	loading?: boolean;
	class?: string;
}

/** A button that asks for a second click within four seconds before running `onConfirm`. */
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
		<Button
			type="button"
			variant={props.variant ?? "primary"}
			size={props.size ?? "sm"}
			shape={awaitingConfirmation() ? "standard" : props.shape}
			title={props.label}
			aria-label={awaitingConfirmation() ? undefined : props.label}
			loading={props.loading}
			class={props.class}
			onClick={handleClick}
		>
			{awaitingConfirmation()
				? (props.confirmationText ??
					T()("common.confirmations.click.to.confirm"))
				: props.children}
		</Button>
	);
};

export default ConfirmActionButton;
