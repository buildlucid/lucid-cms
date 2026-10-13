import { type Accessor, createSignal } from "solid-js";

/** Handles file-only drops through `handlers`, exposing `dragging` for drop-area hints. */
const useFileDrop = (props: {
	enabled: Accessor<boolean>;
	onDrop: (files: File[]) => void;
}) => {
	//* Count nested drag entries to avoid hiding the hint when moving between children.
	const [depth, setDepth] = createSignal(0);

	const hasFiles = (event: DragEvent) =>
		props.enabled() &&
		Array.from(event.dataTransfer?.types ?? []).includes("Files");

	return {
		dragging: () => depth() > 0,
		handlers: {
			onDragEnter: (event: DragEvent) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				setDepth((current) => current + 1);
			},
			onDragOver: (event: DragEvent) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
			},
			onDragLeave: (event: DragEvent) => {
				if (!hasFiles(event)) return;
				setDepth((current) => Math.max(0, current - 1));
			},
			onDrop: (event: DragEvent) => {
				if (!hasFiles(event)) return;
				event.preventDefault();
				setDepth(0);
				props.onDrop(Array.from(event.dataTransfer?.files ?? []));
			},
		},
	};
};

export default useFileDrop;
