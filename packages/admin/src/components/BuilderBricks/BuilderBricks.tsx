import type { Collection } from "@types";
import classNames from "classnames";
import {
	FaSolidChevronUp,
	FaSolidGripLines,
	FaSolidLayerGroup,
} from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import AddBrickModal from "@/components/AddBrickModal/AddBrickModal";
import { BrickBody } from "@/components/BrickBody/BrickBody";
import BrickSlots from "@/components/BrickSlots/BrickSlots";
import Button from "@/components/Button/Button";
import DeleteDebounceButton from "@/components/DeleteDebounceButton/DeleteDebounceButton";
import DragDrop, { type DragDropCBT } from "@/components/DragDrop/DragDrop";
import { FieldErrorBadge } from "@/components/FieldErrorBadge/FieldErrorBadge";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import brickStore, { type BrickData } from "@/store/brickStore/brickStore";
import T from "@/translations";
import type { CollectionBrickConfig } from "@/types/collection-config";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";
import { countFieldErrors } from "@/utils/structural-field-helpers";

interface BuilderBricksProps {
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: Collection["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
}

export const BuilderBricks: Component<BuilderBricksProps> = (props) => {
	// ------------------------------
	// State
	const [getSelectBrickOpen, setSelectBrickOpen] = createSignal(false);

	// ------------------------------
	// Memos
	const configByKey = createMemo(() => {
		return new Map(props.brickConfig.map((b) => [b.key, b]));
	});
	const brickIndexByRef = createMemo(() => {
		const map = new Map<string, number>();
		for (let i = 0; i < brickStore.get.bricks.length; i++) {
			map.set(brickStore.get.bricks[i].ref, i);
		}
		return map;
	});
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
					<div class="flex items-center gap-2.5">
						<FaSolidLayerGroup class="text-icon text-xl" />
						<h2>{T()("builder.area.label")}</h2>
					</div>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => {
							setSelectBrickOpen(true);
						}}
						disabled={isDisabled()}
					>
						{T()("builder.bricks.add")}
					</Button>
				</div>
				<Switch>
					<Match when={builderBricks().length === 0}>
						<div class="p-4 md:p-6 border border-dashed border-border rounded-md min-h-80 grow h-[calc(100%-52px)] flex items-center justify-center dotted-background">
							<div class="max-w-sm text-center mx-auto">
								<h3 class="mb-1">{T()("builder.area.title")}</h3>
								<p class="text-sm">{T()("builder.area.empty")}</p>
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
								}}
							>
								{({ dragDrop }) => (
									<For each={builderBricks()}>
										{(brick) => (
											<BuilderBrickRow
												brick={brick}
												configByKey={configByKey}
												brickIndexByRef={brickIndexByRef}
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

			<AddBrickModal
				state={{ open: getSelectBrickOpen(), setOpen: setSelectBrickOpen }}
				data={{ brickConfig: props.brickConfig }}
			/>
		</Show>
	);
};

interface BuilderBrickRowProps {
	brick: BrickData;
	configByKey: Accessor<Map<string, CollectionBrickConfig>>;
	brickIndexByRef: Accessor<Map<string, number>>;
	collectionMigrationStatus: Collection["migrationStatus"];
	dragDrop: DragDropCBT;
	collectionKey?: string;
	documentId?: number;
}

const DRAG_DROP_KEY = "builder-bricks-zone";

const BuilderBrickRow: Component<BuilderBrickRowProps> = (props) => {
	// -------------------------------
	// State & Hooks
	const localization = useDocumentLocalization();

	// ------------------------------
	// Memos
	const config = createMemo(() => {
		return props.configByKey().get(props.brick.key);
	});
	const brickIndex = createMemo(() => {
		return props.brickIndexByRef().get(props.brick.ref) ?? -1;
	});
	const brickOpen = createMemo(() => props.brick.open === true);
	const previewTriggerId = createMemo(() =>
		getPreviewStructureId({ brickIndex: brickIndex(), type: "brick" }),
	);
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
	const errorCount = createMemo(() => countFieldErrors(fieldErrors()));
	const missingFieldColumns = createMemo(() => {
		return (
			props.collectionMigrationStatus?.missingColumns[props.brick.key] || []
		);
	});

	// -------------------------------
	// Functions
	const toggleDropdown = () => {
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
				"drag-item w-full bg-card border border-border rounded-md mb-4 last:mb-0 ring-inset ring-primary",
				{
					"border-danger-low-border bg-linear-to-b from-danger-low to-card to-30%":
						errorCount() > 0,
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
			aria-invalid={errorCount() > 0}
		>
			{/* Header */}
			{/* biome-ignore lint/a11y/useSemanticElements: Drag, delete and slot buttons cannot be nested inside a native button. */}
			<div
				role="button"
				tabIndex={0}
				id={previewTriggerId()}
				data-preview-focus-open={brickOpen()}
				aria-expanded={brickOpen()}
				aria-controls={`builder-brick-content-${props.brick.ref}`}
				aria-label={helpers.getLocaleValue({
					value: config()?.details.label,
					fallback: props.brick.key,
				})}
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.target !== e.currentTarget) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						toggleDropdown();
					}
				}}
				class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-4 py-3 transition-colors hover:bg-card-hover/60 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
			>
				<div class="flex min-w-0 flex-1 items-center gap-2">
					<button
						type="button"
						class="text-muted hover:text-primary-hover transition-colors duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-1 ring-primary disabled:hover:text-icon! disabled:opacity-50 disabled:cursor-not-allowed"
						onClick={(e) => e.stopPropagation()}
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
						aria-label={T()("common.change.order")}
						disabled={isDisabled()}
					>
						<FaSolidGripLines size={14} />
					</button>
					<h3 class="flex min-h-8 min-w-0 flex-1 items-center">
						{helpers.getLocaleValue({
							value: config()?.details.label,
							fallback: config()?.key,
						})}
					</h3>
				</div>
				<div class="flex items-center gap-2">
					<BrickSlots
						header
						headerClass="mr-1"
						open={brickOpen()}
						brick={props.brick}
						config={config()}
						errors={fieldErrors()}
						collectionKey={props.collectionKey}
						documentId={props.documentId}
						contentLocale={localization.contentLocale() ?? ""}
					/>
					<FieldErrorBadge count={errorCount()} class="mr-1" />
					<DeleteDebounceButton
						callback={() => {
							brickStore.get.removeBrick(brickIndex());
						}}
						disabled={isDisabled()}
					/>
					<span
						aria-hidden="true"
						class={classNames(
							"flex size-7 shrink-0 items-center justify-center text-muted transition-transform duration-200",
							{
								"transform rotate-180": brickOpen(),
							},
						)}
					>
						<FaSolidChevronUp size={14} />
					</span>
				</div>
			</div>
			{/* Body */}
			<BrickBody
				brickConfig={config()}
				id={`builder-brick-content-${props.brick.ref}`}
				open={brickOpen()}
				brick={props.brick}
				brickIndex={brickIndex()}
				configFields={config()?.fields || []}
				labelledby={previewTriggerId()}
				fieldErrors={fieldErrors()}
				missingFieldColumns={missingFieldColumns()}
				collectionKey={props.collectionKey}
				documentId={props.documentId}
				options={{
					padding: "16",
				}}
			/>
		</li>
	);
};
