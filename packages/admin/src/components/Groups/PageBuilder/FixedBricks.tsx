import type { CollectionBrickConfig, CollectionResponse } from "@types";
import { FaSolidShield } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, For } from "solid-js";
import { BrickBody } from "@/components/Groups/Builder";
import brickStore, { type BrickData } from "@/store/brickStore";
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
				{(brick) => (
					<FixedBrickRow
						brick={brick}
						configByKey={configByKey}
						brickIndexByRef={brickIndexByRef}
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
	configByKey: Accessor<Map<string, CollectionBrickConfig>>;
	brickIndexByRef: Accessor<Map<string, number>>;
	collectionMigrationStatus: CollectionResponse["migrationStatus"];
	collectionKey?: string;
	documentId?: number;
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
	// Render
	return (
		<li class="w-full border-b border-border">
			{/* Header */}
			<div
				class={
					"flex justify-between pt-4 md:pt-6 px-4 md:px-6 focus:outline-hidden"
				}
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
			</div>
			{/* Body */}
			<BrickBody
				state={{
					open: true,
					brick: props.brick,
					brickIndex: brickIndex(),
					configFields: config()?.fields || [],
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
