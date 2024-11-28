import { type Component, createMemo, For, createSignal } from "solid-js";
import type { CollectionBrickConfig } from "@types";
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
					<FixedBrickRow brick={brick} brickConfig={props.brickConfig} />
				)}
			</For>
		</ul>
	);
};

interface FixedBrickRowProps {
	brick: BrickData;
	brickConfig: CollectionBrickConfig[];
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
			(brick) => brick.id === props.brick.id,
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
					"flex justify-between cursor-pointer pt-15 px-15 md:px-30 md:pt-30 focus:outline-hidden",
					{
						"pb-0": getBrickOpen(),
						"pb-15 md:pb-30": !getBrickOpen(),
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
				}}
				options={{
					padding: "30",
					bleedTop: true,
				}}
			/>
		</li>
	);
};
