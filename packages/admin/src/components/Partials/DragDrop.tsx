import {
	type Component,
	type JSXElement,
	type Accessor,
	createSignal,
	onMount,
} from "solid-js";

interface DragItemProps {
	ref: string;
	key: string;
}

export interface DragDropCBT {
	getIsDragging: Accessor<boolean>;
	getDragging: Accessor<DragItemProps | undefined>;
	getDraggingTarget: Accessor<DragItemProps | undefined>;

	onDragStart: (_e: DragEvent, _item: DragItemProps) => void;
	onDragEnd: (_e: DragEvent) => void;
	onDragEnter: (_e: DragEvent, _item: DragItemProps) => void;
	onDragOver: (_e: DragEvent) => void;
}

interface DragDropProps {
	sortOrder: (_ref: string, _targetRef: string) => void;
	children: (_props: { dragDrop: DragDropCBT }) => JSXElement;
}

const DragDrop: Component<DragDropProps> = (props) => {
	// ------------------------------
	// State
	const [getIsDragging, setIsDragging] = createSignal<boolean>(false);

	// the item being dragged
	const [getDragging, setDragging] = createSignal<DragItemProps | undefined>(
		undefined,
	);

	// the item being dragged over
	const [getDraggingTarget, setDraggingTarget] = createSignal<
		DragItemProps | undefined
	>(undefined);
	const [getHasViewTransition, setHasViewTransition] =
		createSignal<boolean>(false);

	// ------------------------------
	// Functions
	const updateSortOrder = (isDragging: boolean, target: HTMLElement) => {
		if (!validDragTarget(target)) return;

		const dragging = getDragging();
		const dragTarget = getDraggingTarget();

		if (dragging === undefined || dragTarget === undefined) return;
		if (dragging.ref === dragTarget.ref) return;

		const updateFn = () => {
			props.sortOrder(dragging.ref, dragTarget.ref);
			if (isDragging) {
				setDragging(dragTarget);
			}
		};

		if (getHasViewTransition()) {
			// @ts-ignore
			document.startViewTransition(updateFn);
		} else {
			updateFn();
		}
	};

	const validDragTarget = (target: HTMLElement) => {
		let valid = false;

		const dragging = getDragging();
		const dragTarget = getDraggingTarget();
		if (dragging === undefined || dragTarget === undefined) return false;

		// recursively check parent nodes for valid drop target via data-zoneId attribute
		const checkParentNodes = (node: HTMLElement) => {
			if (node.dataset?.dragkey === dragTarget?.key) {
				valid = true;
				return;
			}
			if (node.parentNode) checkParentNodes(node.parentNode as HTMLElement);
		};
		checkParentNodes(target);

		return valid;
	};

	// ------------------------------
	// Events
	const onDragStart = (e: DragEvent, item: DragItemProps) => {
		e.dataTransfer?.setDragImage(new Image(), 0, 0);
		e.stopPropagation();

		setDragging(item);
		setDraggingTarget(item);
		setIsDragging(true);
	};

	const onDragEnd = (e: DragEvent) => {
		e.preventDefault();
		const target = e.target as HTMLElement;
		updateSortOrder(false, target);

		setDragging(undefined);
		setDraggingTarget(undefined);
		setIsDragging(false);
	};

	const onDragEnter = (e: DragEvent, item: DragItemProps) => {
		e.preventDefault();
		if (!validDragTarget(e.target as HTMLElement)) return;

		setDraggingTarget(item);
	};

	const onDragOver = (e: DragEvent) => {
		e.preventDefault();
	};

	// ----------------------------------
	// Effects
	onMount(() => {
		setHasViewTransition("startViewTransition" in document);
	});

	// ----------------------------------
	// Render
	return (
		<div class={"w-full"}>
			{props.children({
				dragDrop: {
					getIsDragging,
					getDragging,
					getDraggingTarget,
					onDragStart,
					onDragEnd,
					onDragEnter,
					onDragOver,
				},
			})}
		</div>
	);
};

export default DragDrop;
