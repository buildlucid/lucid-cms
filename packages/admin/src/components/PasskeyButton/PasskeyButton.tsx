import { TbOutlineFingerprint } from "solid-icons/tb";
import type { Component } from "solid-js";
import Button from "@/components/Button/Button";

interface PasskeyButtonProps {
	label: string;
	onClick: () => void;
	loading?: boolean;
	disabled?: boolean;
	/** `primary` when the passkey is the only way on. @default "outline" */
	variant?: "outline" | "primary";
}

const PasskeyButton: Component<PasskeyButtonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Button
			type="button"
			variant={props.variant ?? "outline"}
			size="lg"
			class={
				props.variant === "primary"
					? "w-full"
					: // matches ProviderButton's text colour, which is quieter than the outline variant
						"w-full text-body! hover:text-secondary-foreground!"
			}
			loading={props.loading}
			disabled={props.disabled}
			onClick={props.onClick}
		>
			<TbOutlineFingerprint class="size-4 mr-3" />
			{props.label}
		</Button>
	);
};

export default PasskeyButton;
