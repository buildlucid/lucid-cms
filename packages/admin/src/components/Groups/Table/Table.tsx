import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	type JSXElement,
	Match,
	Show,
	Switch,
} from "solid-js";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import LoadingRow from "@/components/Tables/Rows/LoadingRow";
import type { QueryStateResponse } from "@/hooks/useQueryState";
import { ColumnToggle } from "./ColumnToggle";
import { SelectAction } from "./SelectAction";
import { Th } from "./Th";

export type TableTheme = "primary" | "secondary" | "contained";

export interface TableRowReorder {
	enabled: boolean;
	draggingIndex: number | null;
	dropTargetIndex: number | null;
	onDragStart: (_index: number, _e: DragEvent) => void;
	onDragEnd: (_e: DragEvent) => void;
	onDragEnter: (_index: number, _e: DragEvent) => void;
	onDragOver: (_e: DragEvent) => void;
}

interface TableRootProps {
	key: string;
	rows: number;
	caption?: string;
	searchParams?: QueryStateResponse;
	head: {
		label: string;
		key: string;
		icon?: JSXElement;
		sortable?: boolean;
		width?: number;
		minWidth?: number;
	}[];
	state: {
		isLoading: boolean;
		isSuccess: boolean;
	};
	options?: {
		isSelectable?: boolean;
		padding?: "16" | "24";
		totalLoadingRows?: number;
		allowRestore?: boolean;
		allowDelete?: boolean;
		allowDeletePermanently?: boolean;
	};
	callbacks?: {
		deleteRows?: (_selected: boolean[]) => Promise<void>;
		restoreRows?: (_selected: boolean[]) => Promise<void>;
		deletePermanentlyRows?: (_selected: boolean[]) => Promise<void>;
	};
	/** Opt-in row reordering; rows decide whether to render handles. */
	reorder?: {
		enabled: boolean;
		onReorder: (
			_dragIndex: number,
			_targetIndex: number,
		) => void | Promise<void>;
	};
	copy?: {
		deleteModalTitle?: string;
		deleteModalDescription?: string;
		restoreModalTitle?: string;
		restoreModalDescription?: string;
		deletePermanentlyModalTitle?: string;
		deletePermanentlyModalDescription?: string;
	};
	theme?: TableTheme;
	children: (_props: {
		include: boolean[];
		isSelectable: boolean;
		selected: boolean[];
		setSelected: (_i: number) => void;
		theme?: TableTheme;
		rowReorder: TableRowReorder;
	}) => JSXElement;
}

const tableScrollPositions = new Map<string, number>();

export const Table: Component<TableRootProps> = (props) => {
	let overflowRef: HTMLDivElement | undefined;

	const [include, setInclude] = createSignal<boolean[]>([]);
	const [selected, setSelected] = createSignal<boolean[]>([]);
	const [dragIndex, setDragIndex] = createSignal<number | null>(null);
	const [dropTargetIndex, setDropTargetIndex] = createSignal<number | null>(
		null,
	);

	// ----------------------------------------
	// Functions
	const toggleInclude = (index: number) => {
		const isOnlyOne = include().filter((i) => i).length === 1;
		if (isOnlyOne && include()[index]) {
			return;
		}

		setInclude((prev) => {
			const newInclude = [...prev];
			newInclude[index] = !newInclude[index];
			return newInclude;
		});

		setIncludeLS(include());
	};
	const setSelectedIndex = (index: number) => {
		setSelected((prev) => {
			const newSelected = [...prev];
			newSelected[index] = !newSelected[index];
			return newSelected;
		});
	};
	const setOverflowState = () => {
		if (overflowRef && overflowRef.scrollWidth > overflowRef.clientWidth) {
			overflowRef.setAttribute("data-overflowing", "true");
		} else {
			overflowRef?.setAttribute("data-overflowing", "false");
		}
	};
	const restoreScrollPosition = () => {
		const scrollLeft = tableScrollPositions.get(props.key);
		if (scrollLeft === undefined) return;

		requestAnimationFrame(() => {
			if (!overflowRef) return;

			overflowRef.scrollLeft = scrollLeft;
			setOverflowState();
		});
	};

	// ----------------------------------------
	// Local Storage
	const getIncludeLS = () => {
		const include = localStorage.getItem(`${props.key}-include`);
		if (include) {
			return JSON.parse(include);
		}
		return props.head.map(() => true);
	};
	const setIncludeLS = (include: boolean[]) => {
		localStorage.setItem(`${props.key}-include`, JSON.stringify(include));
	};

	// ----------------------------------------
	// Callbacks
	const onSelectChange = () => {
		if (props.state.isLoading) return;

		if (allSelected()) {
			setSelected((prev) => {
				return prev.map(() => false);
			});
		} else {
			setSelected((prev) => {
				return prev.map(() => true);
			});
		}
	};

	// ----------------------------------------
	// Row Reorder
	const rowReorderEnabled = createMemo(() => props.reorder?.enabled ?? false);
	const onRowDragStart = (index: number, e: DragEvent) => {
		if (!rowReorderEnabled()) return;
		e.stopPropagation();
		if (e.dataTransfer) {
			const dragImage = document.createElement("canvas");
			dragImage.width = 1;
			dragImage.height = 1;
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/plain", `${index}`);
			e.dataTransfer.setDragImage(dragImage, 0, 0);
		}
		setDragIndex(index);
		setDropTargetIndex(index);
	};
	const onRowDragEnter = (index: number, e: DragEvent) => {
		if (dragIndex() === null) return;
		e.preventDefault();
		setDropTargetIndex(index);
	};
	const onRowDragOver = (e: DragEvent) => {
		if (dragIndex() === null) return;
		e.preventDefault();
	};
	const onRowDragEnd = (e: DragEvent) => {
		e.preventDefault();
		const from = dragIndex();
		const to = dropTargetIndex();

		if (from === null || to === null || from === to) {
			setDragIndex(null);
			setDropTargetIndex(null);
			return;
		}

		const updateRows = () => {
			setDragIndex(null);
			setDropTargetIndex(null);
			void props.reorder?.onReorder(from, to);
		};

		if ("startViewTransition" in document) {
			document.startViewTransition(updateRows);
			return;
		}

		updateRows();
	};

	//* stable handlers limit reorder updates to rows reading drag state
	const rowReorder: TableRowReorder = {
		get enabled() {
			return rowReorderEnabled();
		},
		get draggingIndex() {
			return dragIndex();
		},
		get dropTargetIndex() {
			return dropTargetIndex();
		},
		onDragStart: onRowDragStart,
		onDragEnd: onRowDragEnd,
		onDragEnter: onRowDragEnter,
		onDragOver: onRowDragOver,
	};

	// ----------------------------------------
	// Memos
	const isSelectable = createMemo(() => {
		return props.options?.isSelectable ?? false;
	});
	const allSelected = createMemo(() => {
		if (!selected()) return false;
		if (selected().length === 0) return false;
		return selected().every((s) => s);
	});
	const selectedCount = createMemo(() => {
		return selected().filter((s) => s).length;
	});
	const includeRows = createMemo(() => {
		return props.head.map((h, i) => {
			return {
				index: i,
				label: h.label,
				include: include()[i],
			};
		});
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const handleResize = () => {
			setOverflowState();
		};

		handleResize();
		setInclude(getIncludeLS());

		const selectedValues = [];
		for (let i = 0; i < props.rows; i++) {
			selectedValues.push(false);
		}
		setSelected(selectedValues);

		window.addEventListener("resize", handleResize);
		return () => {
			window.removeEventListener("resize", handleResize);
		};
	});
	createEffect(() => {
		props.key;
		props.rows;
		props.state.isLoading;
		props.state.isSuccess;

		restoreScrollPosition();
	});
	//* index-based selections are cleared when selection is unavailable
	createEffect(() => {
		if (isSelectable()) return;
		setSelected((prev) =>
			prev.some((selected) => selected) ? prev.map(() => false) : prev,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			{/* Table */}
			<div
				class={classNames("w-full overflow-x-auto scrollbar", {
					"border-y border-border bg-card-base": props.theme === "contained",
				})}
				ref={overflowRef}
				onScroll={() => {
					if (!overflowRef) return;
					tableScrollPositions.set(props.key, overflowRef.scrollLeft);
				}}
			>
				<table class="w-full table h-auto border-collapse">
					<Show when={props?.caption}>
						<div class="caption-bottom border-t-primary-base border-t-2 border-b border-b-border bg-input-base text-title py-2 text-sm">
							{props?.caption}
						</div>
					</Show>
					<thead>
						<tr class="h-10">
							<Show when={rowReorderEnabled()}>
								<Th
									classes="w-10"
									theme={props.theme}
									options={{
										padding: props.options?.padding,
									}}
								/>
							</Show>
							<Show when={isSelectable()}>
								<SelectCol
									type="th"
									value={allSelected()}
									onChange={onSelectChange}
									theme={props.theme}
									padding={props.options?.padding}
								/>
							</Show>
							<Index each={props.head}>
								{(head, index) => (
									<Th
										key={head().key}
										index={index}
										label={head().label}
										icon={head().icon}
										searchParams={props.searchParams}
										options={{
											include: include()[index],
											width: head().width,
											minWidth: head().minWidth,
											sortable: head().sortable,
											padding: props.options?.padding,
										}}
										theme={props.theme}
									/>
								)}
							</Index>
							<Th
								classes={"text-right right-0"}
								theme={props.theme}
								options={{
									padding: props.options?.padding,
								}}
							>
								<ColumnToggle
									columns={includeRows() || []}
									callbacks={{
										toggle: toggleInclude,
									}}
								/>
							</Th>
						</tr>
					</thead>
					<tbody>
						<Switch>
							<Match when={props.state.isLoading}>
								<Index
									each={Array.from({
										length: props.options?.totalLoadingRows ?? 10,
									})}
								>
									{() => (
										<LoadingRow
											columns={
												props.head.length + (rowReorderEnabled() ? 1 : 0)
											}
											isSelectable={isSelectable()}
											includes={include()}
											theme={props.theme}
										/>
									)}
								</Index>
							</Match>
							<Match when={props.state.isSuccess}>
								{props.children({
									include: include(),
									isSelectable: isSelectable(),
									selected: selected(),
									setSelected: setSelectedIndex,
									theme: props.theme,
									rowReorder: rowReorder,
								})}
							</Match>
						</Switch>
					</tbody>
				</table>
			</div>
			{/* Select Action */}
			<SelectAction
				selected={selected}
				selectedCount={selectedCount}
				setSelected={setSelected}
				allowRestore={props.options?.allowRestore ?? false}
				allowDelete={props.options?.allowDelete ?? false}
				allowDeletePermanently={props.options?.allowDeletePermanently ?? false}
				callbacks={{
					delete: props.callbacks?.deleteRows,
					restore: props.callbacks?.restoreRows,
					deletePermanently: props.callbacks?.deletePermanentlyRows,
				}}
				copy={props.copy}
			/>
		</>
	);
};
