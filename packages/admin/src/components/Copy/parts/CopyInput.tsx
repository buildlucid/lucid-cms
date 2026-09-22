import classNames from "classnames";
import { FaSolidCopy } from "solid-icons/fa";
import { type Component, createSignal, onCleanup } from "solid-js";
import T from "@/translations";
import { copyValue } from "../copyValue";

export interface CopyInputProps {
	/** Shown in the field and put on the clipboard. */
	value: string;
	/** Names the field for screen readers. */
	label?: string;
	class?: string;
}

export const CopyInput: Component<CopyInputProps> = (props) => {
	// ----------------------------------------
	// State
	const [copied, setCopied] = createSignal(false);
	let resetTimeout: ReturnType<typeof setTimeout> | undefined;

	// ----------------------------------------
	// Functions
	const copy = () => {
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
		<div
			data-copy-input
			class={classNames(
				"relative flex w-full items-stretch overflow-hidden rounded-md border border-border bg-input-base",
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
				onClick={copy}
				class={classNames(
					"absolute top-1/2 left-2.5 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md bg-container-4 transition-colors duration-200 hover:bg-container-5 focus:ring-0 focus-visible:ring-1",
					{
						"text-body hover:text-title": !copied(),
						"text-primary-base hover:text-primary-hover!": copied(),
					},
				)}
				aria-label={T()("actions.copy.to.clipboard")}
			>
				<FaSolidCopy class="fill-current" />
			</button>
		</div>
	);
};
