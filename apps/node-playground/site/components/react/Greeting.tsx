import { useState } from "react";

export default function Greeting(props: { name: string }) {
	const [waved, setWaved] = useState(false);
	return (
		<p>
			Hello, {props.name}{" "}
			<button type="button" onClick={() => setWaved(true)}>
				{waved ? "Waved" : "Wave"}
			</button>
		</p>
	);
}
