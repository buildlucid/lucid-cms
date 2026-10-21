import { useState } from "react";

/** Greets a name you can change, counting the waves back. */
export default function Greeting(props: { name: string }) {
	const [name, setName] = useState(props.name);
	const [waves, setWaves] = useState(0);
	return (
		<p className="greeting">
			Hello,{" "}
			<input
				aria-label="Name"
				size={Math.max(name.length, 4)}
				value={name}
				onChange={(event) => setName(event.target.value)}
			/>{" "}
			<button type="button" onClick={() => setWaves((value) => value + 1)}>
				{waves === 0 ? "Wave" : `Waved ${waves}×`}
			</button>
		</p>
	);
}
