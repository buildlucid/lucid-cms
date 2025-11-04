import T from "@/translations/index";
import classNames from "classnames";
import { type Component, createSignal } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { FaSolidTrashCan } from "solid-icons/fa";

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
		<button
			type="button"
			class={classNames(
				"transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed",
				{
					"text-icon-base hover:text-error-base": getConfirmRemove() === 0,
					"text-error-hover animate-pulse": getConfirmRemove() === 1,
				},
			)}
			onClick={(e) => {
				e.stopPropagation();
				if (getConfirmRemove() === 1) {
					props.callback();
				}
				setConfirmRemove(1);
				revertConfigDelete();
			}}
			aria-label={
				getConfirmRemove() === 1 ? T()("confirm_delete") : T()("delete")
			}
			disabled={props.disabled}
		>
			<FaSolidTrashCan class="w-4" />
		</button>
	);
};

export default DeleteDebounceButton;
