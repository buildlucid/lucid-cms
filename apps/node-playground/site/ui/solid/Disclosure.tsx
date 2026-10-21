import { createSignal, type JSX } from "solid-js";

/** Toggles children with `hidden`, keeping their markup in the page before hydration. */
export default function Disclosure(props: {
	label: string;
	children?: JSX.Element;
}) {
	const [open, setOpen] = createSignal(false);
	return (
		<div class="disclosure">
			<button
				type="button"
				aria-expanded={open()}
				onClick={() => setOpen(!open())}
			>
				{open() ? "Hide" : props.label}
			</button>
			<div hidden={!open()}>{props.children}</div>
		</div>
	);
}
