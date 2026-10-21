import { type ReactNode, useId, useState } from "react";
import "./counter.css";

export default function Counter(props: {
	start?: number;
	children?: ReactNode;
	footer?: ReactNode;
}) {
	const [count, setCount] = useState(props.start ?? 0);
	const id = useId();
	return (
		<div className="counter">
			<label htmlFor={id}>Count</label> <output id={id}>{count}</output>{" "}
			<button type="button" onClick={() => setCount((value) => value + 1)}>
				Add one
			</button>
			{props.children}
			{props.footer}
		</div>
	);
}
