import T from "@/translations";
import {
	type Component,
	createMemo,
	For,
	Show,
	createSignal,
	Switch,
	Match,
} from "solid-js";
import type { CollectionBrickConfig, CollectionResponse } from "@types";
import {
	FaSolidCircleChevronUp,
	FaSolidGripLines,
	FaSolidLayerGroup,
} from "solid-icons/fa";
import classNames from "classnames";
import brickStore, { type BrickData } from "@/store/brickStore";
import {
	BrickBody,
	BrickImagePreviewButton,
} from "@/components/Groups/Builder";
import Button from "@/components/Partials/Button";
import AddBrick from "@/components/Modals/Bricks/AddBrick";
import DeleteDebounceButton from "@/components/Partials/DeleteDebounceButton";
import helpers from "@/utils/helpers";
import DragDrop, { type DragDropCBT } from "@/components/Partials/DragDrop";
import { tabStateHelpers } from "@/utils/tab-state-helpers";

interface BuilderBricksProps {
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
}

export const BuilderBricks: Component<BuilderBricksProps> = (props) => {
	// ------------------------------
	// State
	const [getSelectBrickOpen, setSelectBrickOpen] = createSignal(false);

	// ------------------------------
	// Memos
	const builderBricks = createMemo(() =>
		brickStore.get.bricks
			.filter((brick) => brick.type === "builder")
			.sort((a, b) => a.order - b.order),
	);
	const isDisabled = createMemo(() => {
		return brickStore.get.locked;
	});

	// ----------------------------------
	// Render
	return (
		<Show when={props.brickConfig.length > 0}>
			<div class="p-6 h-full">
				<div class="flex justify-between mb-4">
					<div class="flex items-center">
						<FaSolidLayerGroup class="text-white text-xl mr-2.5" />
						<h2>{T()("builder_area")}:</h2>
					</div>
					<Button
						type="button"
						theme="secondary"
						size="small"
						onClick={() => {
							setSelectBrickOpen(true);
						}}
						disabled={isDisabled()}
					>
						{T()("add_brick")}
					</Button>
				</div>
				<Switch>
					<Match when={builderBricks().length === 0}>
						<div class="p-4 md:p-6 border border-dashed border-border rounded-md min-h-80 grow h-[calc(100%-52px)] flex items-center justify-center">
							<div class="max-w-sm text-center mx-auto">
								<h3 class="mb-1">{T()("builder_area_title")}</h3>
								<p class="text-sm">{T()("builder_area_empty")}</p>
							</div>
						</div>
					</Match>
					<Match when={builderBricks().length > 0}>
						<ol class="w-full">
							<DragDrop
								sortOrder={(ref, targetRef) => {
									brickStore.get.swapBrickOrder({
										brickRef: ref,
										targetBrickRef: targetRef,
									});

									if (props.collectionKey && props.documentId) {
										tabStateHelpers.updateBrickOrders(
											props.collectionKey,
											props.documentId,
											// @ts-expect-error
											builderBricks().map((b) => {
												return {
													[b.key]: b.order,
												};
											}),
										);
									}
								}}
							>
								{({ dragDrop }) => (
									<For each={builderBricks()}>
										{(brick) => (
											<BuilderBrickRow
												brick={brick}
												brickConfig={props.brickConfig}
												collectionMigrationStatus={
													props.collectionMigrationStatus
												}
												dragDrop={dragDrop}
												collectionKey={props.collectionKey}
												documentId={props.documentId}
											/>
										)}
									</For>
								)}
							</DragDrop>
						</ol>
					</Match>
				</Switch>
			</div>

			<AddBrick
				state={{
					open: getSelectBrickOpen(),
					setOpen: setSelectBrickOpen,
				}}
				data={{
					brickConfig: props.brickConfig,
				}}
			/>
		</Show>
	);
};

interface BuilderBrickRowProps {
	brick: BrickData;
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	dragDrop: DragDropCBT;
	collectionKey?: string;
	documentId?: number;
}

const DRAG_DROP_KEY = "builder-bricks-zone";

const BuilderBrickRow: Component<BuilderBrickRowProps> = (props) => {
	// -------------------------------
	// State
	const [getBrickOpen, setBrickOpen] = createSignal(!!props.brick.open);

	// ------------------------------
	// Memos
	const config = createMemo(() => {
		return props.brickConfig.find((brick) => brick.key === props.brick.key);
	});
	const brickIndex = createMemo(() => {
		return brickStore.get.bricks.findIndex(
			(brick) => brick.ref === props.brick.ref,
		);
	});
	const isDisabled = createMemo(() => {
		return brickStore.get.locked;
	});
	const fieldErrors = createMemo(() => {
		return (
			brickStore.get.brickErrors.find(
				(b) => b.key === props.brick.key && b.ref === props.brick.ref,
			)?.fields || []
		);
	});
	const missingFieldColumns = createMemo(() => {
		return (
			props.collectionMigrationStatus?.missingColumns[props.brick.key] || []
		);
	});

	// -------------------------------
	// Functions
	const toggleDropdown = () => {
		setBrickOpen(!getBrickOpen());
		brickStore.get.toggleBrickOpen(brickIndex());
	};

	// -------------------------------
	// Render
	return (
		<li
			data-dragkey={DRAG_DROP_KEY}
			style={{
				"view-transition-name": `brick-item-${props.brick.ref}`,
			}}
			class={classNames(
				"drag-item w-full bg-card-base border border-border rounded-md mb-4 last:mb-0 ring-inset ring-primary-base",
				{
					"opacity-60": props.dragDrop.getDragging()?.ref === props.brick.ref,
					"ring-1 ring-inset":
						props.dragDrop.getDraggingTarget()?.ref === props.brick.ref,
				},
			)}
			onDragStart={(e) =>
				props.dragDrop.onDragStart(e, {
					ref: props.brick.ref,
					key: DRAG_DROP_KEY,
				})
			}
			onDragEnd={(e) => props.dragDrop.onDragEnd(e)}
			onDragEnter={(e) =>
				props.dragDrop.onDragEnter(e, {
					ref: props.brick.ref,
					key: DRAG_DROP_KEY,
				})
			}
			onDragOver={(e) => props.dragDrop.onDragOver(e)}
		>
			{/* Header */}
			<div
				class={classNames(
					"flex items-center justify-between cursor-pointer px-4 py-2.5 rounded-md focus:outline-hidden",
				)}
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						toggleDropdown();
					}
				}}
				aria-expanded={getBrickOpen()}
				aria-controls={`bulder-brick-content-${props.brick.key}`}
				// biome-ignore lint/a11y/useSemanticElements: <explanation>
				role="button"
				tabIndex="0"
			>
				<div class="flex items-center">
					<button
						type="button"
						class="text-icon-base mr-2 hover:text-primary-hover transition-colors duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-1 ring-primary-base disabled:hover:text-icon-base! disabled:opacity-50 disabled:cursor-not-allowed"
						onDragStart={(e) =>
							props.dragDrop.onDragStart(e, {
								ref: props.brick.ref,
								key: DRAG_DROP_KEY,
							})
						}
						onDragEnd={(e) => props.dragDrop.onDragEnd(e)}
						onDragEnter={(e) =>
							props.dragDrop.onDragEnter(e, {
								ref: props.brick.ref,
								key: DRAG_DROP_KEY,
							})
						}
						onDragOver={(e) => props.dragDrop.onDragOver(e)}
						draggable={isDisabled() === false}
						aria-label={T()("change_order")}
						disabled={isDisabled()}
					>
						<FaSolidGripLines class="w-4" />
					</button>
					<h3>
						{helpers.getLocaleValue({
							value: config()?.details.name,
							fallback: config()?.key,
						})}
					</h3>
				</div>
				<div class="flex gap-2">
					<BrickImagePreviewButton brickConfig={config()} />
					<DeleteDebounceButton
						callback={() => {
							brickStore.get.removeBrick(brickIndex());
						}}
						disabled={isDisabled()}
					/>
					<button
						type="button"
						tabIndex="-1"
						class={classNames(
							"text-2xl text-icon-base hover:text-icon-hover transition-all duration-200",
							{
								"transform rotate-180": getBrickOpen(),
							},
						)}
					>
						<FaSolidCircleChevronUp size={16} />
					</button>
				</div>
			</div>
			{/* Body */}
			<BrickBody
				state={{
					open: getBrickOpen(),
					brick: props.brick,
					brickIndex: brickIndex(),
					configFields: config()?.fields || [],
					labelledby: `builder-brick-${props.brick.key}`,
					fieldErrors: fieldErrors(),
					missingFieldColumns: missingFieldColumns(),
					collectionKey: props.collectionKey,
					documentId: props.documentId,
				}}
				options={{
					padding: "16",
				}}
			/>
		</li>
	);
};
