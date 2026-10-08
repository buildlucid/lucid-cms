import classNames from "classnames";
import { TbOutlineCheck, TbOutlineCopy } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import { createCopy } from "../copyValue";

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
	const [copied, copy] = createCopy(() => props.value);

	// ----------------------------------------
	// Render
	return (
		<button
			data-copy-button
			type="button"
			onClick={(e) => {
				e.stopPropagation();
				void copy();
			}}
			class={classNames(
				"flex max-w-full cursor-copy items-center whitespace-nowrap text-sm transition-colors duration-200",
				{
					"text-body hover:text-primary-hover": !copied(),
					"text-success": copied(),
				},
				props.class,
			)}
		>
			<Show
				when={copied()}
				fallback={<TbOutlineCopy class="mr-2 shrink-0" size={14} />}
			>
				<TbOutlineCheck class="mr-2 shrink-0" size={14} />
			</Show>
			<span class="overflow-hidden text-sm text-ellipsis">
				{props.label ?? props.value}
			</span>
		</button>
	);
};
