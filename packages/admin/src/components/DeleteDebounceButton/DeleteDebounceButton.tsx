import { debounce } from "@solid-primitives/scheduled";
import classNames from "classnames";
import { FaRegularTrashCan } from "solid-icons/fa";
import { type Component, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations/index";

interface DeleteButtonProps {
	disabled?: boolean;
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
				"transition-all duration-200 focus:outline-hidden focus-visible:ring-1 ring-primary disabled:hover:text-icon! disabled:opacity-50 disabled:cursor-not-allowed",
				{
					"text-muted fill-muted hover:text-danger hover:fill-danger":
						getConfirmRemove() === 0,
					"text-danger-hover fill-danger-hover animate-pulse":
						getConfirmRemove() === 1,
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
			disabled={props.disabled}
		>
			<FaRegularTrashCan size={14} />
		</Button>
	);
};

export default DeleteDebounceButton;
