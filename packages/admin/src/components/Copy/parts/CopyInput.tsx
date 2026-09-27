import classNames from "classnames";
import { FaSolidCheck, FaSolidCopy } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import T from "@/translations";
import { createCopy } from "../copyValue";

export interface CopyInputProps {
	value: string;
	/** Accessible label for the input. */
	label?: string;
	class?: string;
}

/** A read-only input with a copy button. */
export const CopyInput: Component<CopyInputProps> = (props) => {
	// ----------------------------------------
	// State
	const [copied, copy] = createCopy(() => props.value);

	// ----------------------------------------
	// Render
	return (
		<div
			data-copy-input
			class={classNames(
				"relative flex w-full items-stretch overflow-hidden rounded-md border border-border bg-input",
				props.class,
			)}
		>
			<input
				class="h-12 flex-1 bg-transparent pr-2.5 pl-10 text-sm font-medium text-subtitle focus:outline-hidden"
				type="text"
				value={props.value}
				disabled={true}
				aria-label={props.label}
			/>
			<button
				type="button"
				onClick={() => void copy()}
				class={classNames(
					"absolute top-1/2 left-2.5 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md bg-input transition-colors duration-200 focus:ring-0 focus-visible:ring-1",
					{
						"text-body hover:text-title": !copied(),
						"text-success hover:text-success!": copied(),
					},
				)}
				aria-label={T()("actions.copy.to.clipboard")}
			>
				<Show when={copied()} fallback={<FaSolidCopy class="fill-current" />}>
					<FaSolidCheck class="fill-current" />
				</Show>
			</button>
		</div>
	);
};
