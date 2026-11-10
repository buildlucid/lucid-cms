import { debounce } from "@solid-primitives/scheduled";
import classnames from "classnames";
import { TbOutlineX } from "solid-icons/tb";
import { type Component, createSignal, onCleanup } from "solid-js";
import Tooltip from "@/components/Tooltip/Tooltip";

/**
 * The small square danger outline that removes a reference, revealed on hover
 * or focus within a `group`. Position it with `class`, eg. `end-1 top-1`. With
 * a `confirmLabel`, the first click primes it and the second removes, like
 * brick deletion.
 */
const AgentReferenceRemoveButton: Component<{
	label: string;
	/** Asks for a second click, labelled with this while primed. */
	confirmLabel?: string;
	class: string;
	onRemove: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [primed, setPrimed] = createSignal(false);

	// ----------------------------------------
	// Functions
	const unprime = debounce(() => setPrimed(false), 4000);
	const label = () =>
		primed() && props.confirmLabel ? props.confirmLabel : props.label;

	// ----------------------------------------
	// Effects
	onCleanup(() => unprime.clear());

	// ----------------------------------------
	// Render
	return (
		<Tooltip
			type="button"
			class={classnames(
				"absolute flex size-5 items-center justify-center rounded-sm border transition-[opacity,background-color,color] focus-ring focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100",
				primed()
					? "border-danger bg-danger-hover text-danger-foreground opacity-100"
					: "border-border bg-input text-subtitle opacity-0 hover:border-danger hover:bg-danger-hover hover:text-danger-foreground",
				props.class,
			)}
			aria-label={label()}
			content={label()}
			onClick={() => {
				if (!props.confirmLabel || primed()) {
					unprime.clear();
					setPrimed(false);
					props.onRemove();
					return;
				}
				setPrimed(true);
				unprime();
			}}
		>
			<TbOutlineX size={9} />
		</Tooltip>
	);
};

export default AgentReferenceRemoveButton;
