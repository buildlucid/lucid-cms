import {
	type Accessor,
	type Component,
	createSignal,
	type JSXElement,
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
	animationMode?: "auto" | "view-transition" | "web-animation";
	children: (_props: { dragDrop: DragDropCBT }) => JSXElement;
}

const DragDrop: Component<DragDropProps> = (props) => {
	// ------------------------------
	// State
	let containerRef: HTMLDivElement | undefined;
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
	const getDragKeySelector = (dragKey: string) => {
		if ("CSS" in window && typeof window.CSS.escape === "function") {
			return window.CSS.escape(dragKey);
		}

		return dragKey.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
	};

	const getDragElements = (dragKey: string) => {
		if (!containerRef) return [];

		const dragKeySelector = getDragKeySelector(dragKey);

		return Array.from(
			containerRef.querySelectorAll<HTMLElement>(
				`[data-dragkey="${dragKeySelector}"][data-dragref]`,
			),
		);
	};

	const captureElementPositions = (dragKey: string) => {
		const positions = new Map<string, DOMRect>();

		for (const element of getDragElements(dragKey)) {
			const dragRef = element.dataset.dragref;
			if (!dragRef) continue;

			positions.set(dragRef, element.getBoundingClientRect());
		}

		return positions;
	};

	const animateWithWebAnimations = (
		dragKey: string,
		updateFn: VoidFunction,
	) => {
		const beforePositions = captureElementPositions(dragKey);
		updateFn();

		requestAnimationFrame(() => {
			for (const element of getDragElements(dragKey)) {
				const dragRef = element.dataset.dragref;
				if (!dragRef) continue;

				const before = beforePositions.get(dragRef);
				if (!before) continue;

				const after = element.getBoundingClientRect();
				const deltaX = before.left - after.left;
				const deltaY = before.top - after.top;

				if (deltaX === 0 && deltaY === 0) continue;

				element.animate(
					[
						{
							transform: `translate(${deltaX}px, ${deltaY}px)`,
						},
						{
							transform: "translate(0, 0)",
						},
					],
					{
						duration: 200,
						easing: "ease",
					},
				);
			}
		});
	};

	const shouldUseViewTransition = () => {
		if (props.animationMode === "web-animation") return false;
		if (props.animationMode === "view-transition") {
			return getHasViewTransition();
		}

		return getHasViewTransition();
	};

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

		if (shouldUseViewTransition()) {
			document.startViewTransition(updateFn);
		} else if (props.animationMode === "web-animation") {
			animateWithWebAnimations(dragging.key, updateFn);
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
		<div ref={containerRef} class={"w-full"}>
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
