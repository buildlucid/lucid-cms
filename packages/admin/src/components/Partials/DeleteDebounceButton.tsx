import { debounce } from "@solid-primitives/scheduled";
import classNames from "classnames";
import { FaRegularTrashCan } from "solid-icons/fa";
import { type Component, createSignal } from "solid-js";
import Button from "@/components/Partials/Button";
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
			theme="danger-subtle"
			size="icon-subtle"
			classes={classNames(
				"transition-all duration-200 focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed",
				{
					"text-icon-faded fill-icon-faded hover:text-error-base hover:fill-error-base":
						getConfirmRemove() === 0,
					"text-error-hover fill-error-hover animate-pulse":
						getConfirmRemove() === 1,
				},
			)}
			onMouseDown={(e) => {
				e.stopPropagation();
			}}
			onClick={() => {
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
			<FaRegularTrashCan size={14} />
		</Button>
	);
};

export default DeleteDebounceButton;
