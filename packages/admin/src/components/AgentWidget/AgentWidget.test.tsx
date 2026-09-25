import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { expect, test, vi } from "vitest";
import type { AdminOptions } from "../../extensions/types/config";
import AgentWidget from "./AgentWidget";
import type { AgentWidgetProps } from "./types";

vi.mock("virtual:lucid-admin", () => ({
	agentWidgetSlots: [
		{
			key: "note-v1",
			slot: "agent.widget",
			match: { widget: "note", version: 1 },
			options: { label: "Note" },
			component: (props: AgentWidgetProps<AdminOptions>) => (
				<p>
					{String(props.options.label)}: {String(props.data.title)}
				</p>
			),
		},
		{
			key: "note-v2",
			slot: "agent.widget",
			match: { widget: "note", version: 2 },
			component: (props: AgentWidgetProps) => (
				<p>Updated note: {String(props.data.title)}</p>
			),
		},
	],
}));

test("renders slot data and options, switches versions, and falls back for unknown widgets", () => {
	const target = document.createElement("div");
	const [version, setVersion] = createSignal(1);
	const dispose = render(
		() => (
			<AgentWidget key="note" version={version()} data={{ title: "Saved" }} />
		),
		target,
	);
	try {
		expect(target.textContent).toBe("Note: Saved");
		setVersion(2);
		expect(target.textContent).toBe("Updated note: Saved");
		setVersion(3);
		expect(target.textContent).toContain("note");
		expect(target.textContent).not.toContain("Saved");
	} finally {
		dispose();
	}
});
