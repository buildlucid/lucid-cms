import type { ReactNode } from "react";

/** A server-only wrapper, to show hydrated components inside it. */
export default function Panel(props: { title: string; children?: ReactNode }) {
	return (
		<section className="panel">
			<h2>{props.title}</h2>
			{props.children}
		</section>
	);
}
