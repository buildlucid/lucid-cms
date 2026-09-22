import classNames from "classnames";
import { FaSolidCopy } from "solid-icons/fa";
import { type Component, createSignal, onCleanup } from "solid-js";
import { copyValue } from "../copyValue";

export interface CopyButtonProps {
	value: string;
	/** Text shown instead of the value. */
	label?: string;
	class?: string;
}

/** Text that copies the value when clicked. */
export const CopyButton: Component<CopyButtonProps> = (props) => {
	// ----------------------------------------
	// State
	const [copied, setCopied] = createSignal(false);
	let resetTimeout: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Functions
	const copy = (e: Event) => {
		e.stopPropagation();
		copyValue(props.value);
		setCopied(true);
		if (resetTimeout) clearTimeout(resetTimeout);
		resetTimeout = setTimeout(() => setCopied(false), 2000);
	};

	// ----------------------------------------
	// Effects
	onCleanup(() => {
		if (resetTimeout) clearTimeout(resetTimeout);
	});

	// ----------------------------------------
	// Render
	return (
		<button
			data-copy-button
			type="button"
			onClick={copy}
			class={classNames(
				"flex max-w-full cursor-copy items-center whitespace-nowrap text-sm transition-colors duration-200",
				{
					"text-body fill-body hover:text-primary-hover hover:fill-primary-hover":
						!copied(),
					"text-success fill-success": copied(),
				},
				props.class,
			)}
		>
			<FaSolidCopy class="mr-2 shrink-0" size={14} />
			<span class="overflow-hidden text-sm text-ellipsis">
				{props.label ?? props.value}
			</span>
		</button>
	);
};
