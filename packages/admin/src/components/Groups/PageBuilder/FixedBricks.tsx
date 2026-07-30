import type { Collection } from "@types";
import classNames from "classnames";
import { FaSolidChevronUp, FaSolidShield } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For } from "solid-js";
import { BrickBody } from "@/components/Groups/Builder";
import { FieldErrorBadge } from "@/components/Partials/FieldErrorBadge";
import brickStore, { type BrickData } from "@/store/brick-store";
import type { CollectionBrickConfig } from "@/types/collection-config";
import helpers from "@/utils/helpers";
import { getPreviewStructureId } from "@/utils/preview-focus-dom";
import { countFieldErrors } from "@/utils/structural-field-helpers";

interface FixedBricksProps {
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: Collection["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
	hasFollowingSection: boolean;
}

export const FixedBricks: Component<FixedBricksProps> = (props) => {
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
	const fixedBricks = createMemo(() =>
		brickStore.get.bricks
			.filter((brick) => brick.type === "fixed")
			.sort((a, b) => a.order - b.order),
	);

	// ----------------------------------
	// Render
	return (
		<ul>
			<For each={fixedBricks()}>
				{(brick, index) => (
					<FixedBrickRow
						brick={brick}
						configByKey={configByKey}
						brickIndexByRef={brickIndexByRef}
						collectionMigrationStatus={props.collectionMigrationStatus}
						collectionKey={props.collectionKey}
						documentId={props.documentId}
						hasDivider={
							index() < fixedBricks().length - 1 || props.hasFollowingSection
						}
					/>
				)}
			</For>
		</ul>
	);
};

interface FixedBrickRowProps {
	brick: BrickData;
	configByKey: Accessor<Map<string, CollectionBrickConfig>>;
	brickIndexByRef: Accessor<Map<string, number>>;
	collectionMigrationStatus: Collection["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
	hasDivider: boolean;
}

const FixedBrickRow: Component<FixedBrickRowProps> = (props) => {
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
			class={classNames("w-full", {
				"border-b border-border": props.hasDivider || !brickOpen(),
				"bg-linear-to-b from-error-base/10 to-transparent to-30%":
					errorCount() > 0,
			})}
			aria-invalid={errorCount() > 0}
		>
			{/* Header */}
			<button
				type="button"
				id={previewTriggerId()}
				data-preview-focus-open={brickOpen()}
				class={classNames(
					"flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors duration-200 hover:bg-card-hover/60 focus:outline-hidden focus-visible:ring-1 ring-inset ring-primary-base md:px-6 md:py-5",
				)}
				onClick={toggleDropdown}
				aria-expanded={brickOpen()}
				aria-controls={`fixed-brick-content-${props.brick.key}`}
			>
				<div class="flex items-center gap-2.5">
					<FaSolidShield class="text-white text-lg" />
					<span class="text-base font-medium text-title">
						{helpers.getLocaleValue({
							value: config()?.details.name,
							fallback: config()?.key,
						})}
					</span>
				</div>
				<span class="flex shrink-0 items-center gap-2">
					<FieldErrorBadge count={errorCount()} class="mr-1" />
					<FaSolidChevronUp
						size={14}
						class={classNames(
							"text-icon-faded transition-transform duration-200",
							{
								"rotate-180": brickOpen(),
							},
						)}
					/>
				</span>
			</button>
			{/* Body */}
			<BrickBody
				id={`fixed-brick-content-${props.brick.key}`}
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
					padding: "24",
					bleedTop: true,
				}}
			/>
		</li>
	);
};
