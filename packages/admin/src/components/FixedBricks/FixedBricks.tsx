import type { Collection } from "@types";
import classNames from "classnames";
import { FaSolidChevronUp, FaSolidShield } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For } from "solid-js";
import { BrickBody } from "@/components/BrickBody/BrickBody";
import BrickSlots from "@/components/BrickSlots/BrickSlots";
import { FieldErrorBadge } from "@/components/FieldErrorBadge/FieldErrorBadge";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import brickStore, { type BrickData } from "@/store/brickStore/brickStore";
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
				"bg-linear-to-b from-danger-low to-transparent to-30%":
					errorCount() > 0,
			})}
			aria-invalid={errorCount() > 0}
		>
			{/* Header */}
			{/* biome-ignore lint/a11y/useSemanticElements: Header slots can contain buttons, which cannot be nested inside a native button. */}
			<div
				role="button"
				tabIndex={0}
				id={previewTriggerId()}
				data-preview-focus-open={brickOpen()}
				class="flex cursor-pointer items-center gap-3 px-4 py-4 transition-colors hover:bg-card-hover/60 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary md:px-6 md:py-5"
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.target !== e.currentTarget) return;
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						toggleDropdown();
					}
				}}
				aria-expanded={brickOpen()}
				aria-controls={`fixed-brick-content-${props.brick.key}`}
				aria-label={helpers.getLocaleValue({
					value: config()?.details.label,
					fallback: props.brick.key,
				})}
			>
				<div class="flex min-h-8 min-w-0 flex-1 items-center gap-2.5 text-left">
					<FaSolidShield class="text-icon text-lg" />
					<span class="text-base font-medium text-title">
						{helpers.getLocaleValue({
							value: config()?.details.label,
							fallback: config()?.key,
						})}
					</span>
				</div>
				<BrickSlots
					header
					open={brickOpen()}
					brick={props.brick}
					config={config()}
					errors={fieldErrors()}
					collectionKey={props.collectionKey}
					documentId={props.documentId}
					contentLocale={localization.contentLocale() ?? ""}
				/>
				<FieldErrorBadge count={errorCount()} />
				<span
					class="flex size-8 shrink-0 items-center justify-center text-muted"
					aria-hidden="true"
				>
					<FaSolidChevronUp
						size={14}
						class={classNames("transition-transform duration-200", {
							"rotate-180": brickOpen(),
						})}
					/>
				</span>
			</div>
			{/* Body */}
			<BrickBody
				brickConfig={config()}
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
