import { createMemo, For, type ParentComponent } from "solid-js";
import { documentSidebarSlots } from "virtual:lucid-admin";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { resolveSlots } from "@/extensions/slot-policy";
import type {
	DocumentSidebarPosition,
	DocumentSidebarSectionKey,
} from "./types";

const defaultPosition: DocumentSidebarPosition = { after: "details" };

/** Renders a built-in sidebar section as its children, with the plugin sections placed before and after it. */
const DocumentSidebarSlots: ParentComponent<{
	section: DocumentSidebarSectionKey;
	collectionKey: string;
}> = (props) => {
	// ----------------------------------
	// Memos
	const entries = createMemo(() =>
		resolveSlots(documentSidebarSlots, { collection: props.collectionKey }),
	);

	// ----------------------------------
	// Functions
	/** The plugin sections placed on one side of this built-in section. */
	const placed = (side: "before" | "after") =>
		entries().filter((entry) => {
			const position: Partial<
				Record<"before" | "after", DocumentSidebarSectionKey>
			> = entry.position ?? defaultPosition;
			return position[side] === props.section;
		});
	const renderEntry = (entry: ReturnType<typeof entries>[number]) => (
		<div data-admin-slot={entry.key}>
			<AdminExtensionBoundary name={entry.key} placement="content">
				<entry.component
					slot={entry.slot}
					preferenceKey={`slot.${entry.key}`}
					options={entry.options}
				/>
			</AdminExtensionBoundary>
		</div>
	);

	// ----------------------------------
	// Render
	//* every section, built-in or plugin, gets exactly one wrapper, which the sidebar hides when empty and divides from the rest
	return (
		<>
			<For each={placed("before")}>{renderEntry}</For>
			<div>{props.children}</div>
			<For each={placed("after")}>{renderEntry}</For>
		</>
	);
};

export default DocumentSidebarSlots;
