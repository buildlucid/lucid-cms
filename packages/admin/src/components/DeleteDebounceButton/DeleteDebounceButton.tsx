import { debounce } from "@solid-primitives/scheduled";
import classNames from "classnames";
import { TbOutlineTrash } from "solid-icons/tb";
import { type Component, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations/index";

interface DeleteButtonProps {
	disabled?: boolean;
	/** Shown on hover, such as why it's disabled. */
	title?: string;
	callback: () => void;
}

const DeleteDebounceButton: Component<DeleteButtonProps> = (props) => {
	// -------------------------------
	// State
	const [getConfirmRemove, setConfirmRemove] = createSignal<0 | 1>(0);

	// -------------------------------
	// Functions
	const revertConfigDelete = debounce(() => {
		setConfirmRemove(0);
	}, 4000);

	// -------------------------------
	// Render
	return (
		<Button
			type="button"
			variant="danger-ghost"
			size="xs"
			shape="square"
			class={classNames(
				"transition-all duration-200 focus-ring disabled:hover:text-icon! disabled:opacity-50 disabled:cursor-not-allowed",
				{
					"text-muted hover:text-danger": getConfirmRemove() === 0,
					"text-danger-hover animate-pulse": getConfirmRemove() === 1,
				},
			)}
			onMouseDown={(e) => {
				e.stopPropagation();
			}}
			onClick={(e) => {
				e.stopPropagation();
				if (getConfirmRemove() === 1) {
					props.callback();
				}
				setConfirmRemove(1);
				revertConfigDelete();
			}}
			aria-label={
				getConfirmRemove() === 1
					? T()("common.confirmations.delete")
					: T()("common.delete")
			}
			tooltip={props.title}
			disabled={props.disabled}
		>
			<TbOutlineTrash size={14} />
		</Button>
	);
};

export default DeleteDebounceButton;
