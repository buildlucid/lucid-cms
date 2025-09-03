import { type Component, createMemo, For, createSignal } from "solid-js";
import type { CollectionBrickConfig, CollectionResponse } from "@types";
import classNames from "classnames";
import { FaSolidCircleChevronUp, FaSolidShield } from "solid-icons/fa";
import brickStore, { type BrickData } from "@/store/brickStore";
import {
	BrickImagePreviewButton,
	BrickBody,
} from "@/components/Groups/Builder";
import helpers from "@/utils/helpers";

interface FixedBricksProps {
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
}

export const FixedBricks: Component<FixedBricksProps> = (props) => {
	// ------------------------------
	// Memos
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
				{(brick) => (
					<FixedBrickRow
						brick={brick}
						brickConfig={props.brickConfig}
						collectionMigrationStatus={props.collectionMigrationStatus}
						collectionKey={props.collectionKey}
						documentId={props.documentId}
					/>
				)}
			</For>
		</ul>
	);
};

interface FixedBrickRowProps {
	brick: BrickData;
	brickConfig: CollectionBrickConfig[];
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
}

const FixedBrickRow: Component<FixedBrickRowProps> = (props) => {
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

	return (
		<li class="w-full border-b border-border focus-within:outline-hidden focus-within:ring-1 ring-inset ring-primary-base">
			{/* Header */}
			<div
				class={classNames(
					"flex justify-between cursor-pointer pt-5 px-5 focus:outline-hidden",
					{
						"pb-0": getBrickOpen(),
						"pb-5": !getBrickOpen(),
					},
				)}
				onClick={toggleDropdown}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						toggleDropdown();
					}
				}}
				id={`fixed-brick-${props.brick.key}`}
				aria-expanded={getBrickOpen()}
				aria-controls={`fixed-brick-content-${props.brick.key}`}
				// biome-ignore lint/a11y/useSemanticElements: <explanation>
				role="button"
				tabIndex="0"
			>
				<div class="flex items-center">
					<FaSolidShield class="text-white text-lg mr-2.5" />
					<h2>
						{helpers.getLocaleValue({
							value: config()?.details.name,
							fallback: config()?.key,
						})}
					</h2>
				</div>
				<div class="flex gap-2">
					<BrickImagePreviewButton brickConfig={config()} />
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
					labelledby: `fixed-brick-${props.brick.key}`,
					fieldErrors: fieldErrors(),
					missingFieldColumns: missingFieldColumns(),
					collectionKey: props.collectionKey,
					documentId: props.documentId,
				}}
				options={{
					padding: "24",
					bleedTop: true,
				}}
			/>
		</li>
	);
};
