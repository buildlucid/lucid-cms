import { debounce } from "@solid-primitives/scheduled";
import {
	type Component,
	createEffect,
	createSignal,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { Input } from "@/components/Groups/Form/Input";

/**
 * Text-style input that keeps a local draft while typing and commits it on a
 * debounce (plus immediately on blur/Enter), so filtering feels live without
 * a request per keystroke or focus loss from re-renders.
 */
export const CommitInput: Component<{
	id: string;
	name: string;
	type: "text" | "number" | "date" | "datetime-local" | "color";
	value: string;
	onCommit: (value: string) => void;
	disabled?: boolean;
	placeholder?: string;
}> = (props) => {
	const [local, setLocal] = createSignal(untrack(() => props.value));
	let focused = false;
	let hiddenColorInputRef: HTMLInputElement | undefined;

	//* committed value changed externally (back/forward navigation, reset)
	createEffect(() => {
		const committed = props.value;
		if (!focused) setLocal(committed);
	});

	const commit = () => {
		if (local() === props.value) return;
		props.onCommit(local());
	};
	const debouncedCommit = debounce(commit, 500);
	onCleanup(() => debouncedCommit.clear());

	const handleChange = (value: string) => {
		setLocal(value);
		debouncedCommit();
	};
	const flushCommit = () => {
		debouncedCommit.clear();
		commit();
	};

	return (
		<Show
			when={props.type === "color"}
			fallback={
				<Input
					id={props.id}
					name={props.name}
					type={props.type}
					value={local()}
					onChange={handleChange}
					onFocus={() => {
						focused = true;
					}}
					onBlur={() => {
						focused = false;
						flushCommit();
					}}
					onKeyUp={(e) => {
						if (e.key === "Enter") flushCommit();
					}}
					disabled={props.disabled}
					copy={{
						placeholder: props.placeholder,
					}}
					noMargin={true}
				/>
			}
		>
			{/* mirrors the colour custom field - swatch opens the picker, the text
			input holds the committed hex value */}
			<div class="relative w-full">
				{/** biome-ignore lint/a11y/useSemanticElements: mirrors Form/Color.tsx swatch trigger */}
				<div
					class="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded border border-border cursor-pointer"
					style={{ "background-color": local() || undefined }}
					onClick={() => hiddenColorInputRef?.click()}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							hiddenColorInputRef?.click();
						}
					}}
					role="button"
					tabIndex={0}
					title="Open color picker"
					aria-label="Open color picker"
				/>
				<input
					ref={(el) => {
						hiddenColorInputRef = el;
					}}
					type="color"
					class="sr-only"
					value={local()}
					onInput={(e) => handleChange(e.currentTarget.value)}
					disabled={props.disabled}
					tabIndex={-1}
					aria-hidden="true"
				/>
				<input
					class="focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-80 text-sm text-title pl-10 pr-3 py-2 bg-input-base border border-border h-10 w-full rounded-md focus:border-primary-base duration-200 transition-colors placeholder:text-unfocused"
					id={props.id}
					name={props.name}
					type="text"
					value={local()}
					placeholder={props.placeholder}
					onInput={(e) => handleChange(e.currentTarget.value)}
					onFocus={() => {
						focused = true;
					}}
					onBlur={() => {
						focused = false;
						flushCommit();
					}}
					onKeyUp={(e) => {
						if (e.key === "Enter") flushCommit();
					}}
					disabled={props.disabled}
				/>
			</div>
		</Show>
	);
};
