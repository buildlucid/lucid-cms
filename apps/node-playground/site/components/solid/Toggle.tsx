import { createSignal, type JSX } from "solid-js";

export default function Toggle(props: { label: string; children?: JSX.Element }) {
	const [on, setOn] = createSignal(false);
	return (
		<div class="toggle">
			<button type="button" aria-pressed={on()} onClick={() => setOn(!on())}>
				{props.label}: {on() ? "on" : "off"}
			</button>
			{props.children}
		</div>
	);
}
