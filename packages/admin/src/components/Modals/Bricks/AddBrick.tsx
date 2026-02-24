import brickIcon from "@assets/svgs/default-brick-icon-white.svg";
import type { CollectionBrickConfig } from "@types";
import classNames from "classnames";
import {
	FaSolidImage,
	FaSolidMagnifyingGlass,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { Tooltip as FormTooltip } from "@/components/Groups/Form/Tooltip";
import { Modal } from "@/components/Groups/Modal";
import BrickPreview from "@/components/Partials/BrickPreview";
import brickStore from "@/store/brickStore";
import helpers from "@/utils/helpers";

interface AddBrickProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	data: {
		brickConfig: CollectionBrickConfig[];
	};
}

const AddBrick: Component<AddBrickProps> = (props) => {
	// ------------------------------
	// State
	const [getHighlightedBrick, setHighlightedBrick] = createSignal<
		string | undefined
	>(undefined);

	const [getSearchQuery, setSearchQuery] = createSignal<string>("");

	// ------------------------------
	// Memos
	const brickList = createMemo(() => {
		return props.data.brickConfig.filter((brickConfig) => {
			if (!getSearchQuery()) return true;
			return helpers
				.getLocaleValue({
					value: brickConfig.details.name,
					fallback: brickConfig.key,
				})
				.toLowerCase()
				.includes(getSearchQuery().toLowerCase());
		});
	});

	const highlightedBrick = createMemo(() => {
		const highlighted = props.data.brickConfig.find(
			(brickConfig) => brickConfig.key === getHighlightedBrick(),
		);
		if (!highlighted) {
			const brickListd = brickList();
			if (brickListd.length > 0) {
				setHighlightedBrick(brickListd[0].key);
			}
		}
		return highlighted;
	});

	// ------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
		>
			{/* Search */}
			<div class="h-14 w-full relative">
				<div class="absolute top-0 left-4 h-full flex items-center justify-center pointer-events-none">
					<FaSolidMagnifyingGlass class="w-4 text-unfocused" />
				</div>
				<input
					class="h-full bg-background-base w-full border-b border-border px-10 focus:outline-hidden text-title placeholder:text-unfocused"
					placeholder="search"
					value={getSearchQuery()}
					onInput={(e) => setSearchQuery(e.currentTarget.value)}
				/>
				<Show when={getSearchQuery()}>
					<button
						class="absolute top-0 right-4 h-full flex items-center justify-center cursor-pointer"
						onClick={() => {
							setSearchQuery("");
						}}
						type="button"
					>
						<FaSolidXmark class="w-4 text-error-base" />
					</button>
				</Show>
			</div>
			{/* Content */}
			<div class="flex h-96">
				{/* Options */}
				<div class="w-[40%] p-4 overflow-y-auto h-full">
					<ul class="h-full w-full">
						<For each={brickList()}>
							{(brickConfig) => (
								<li class="w-full">
									<button
										class={classNames(
											"flex items-center font-medium w-full p-2.5 rounded-md transition-colors duration-200 hover:text-title text-sm",
											{
												"bg-card-base":
													brickConfig.key === getHighlightedBrick(),
												"bg-background-base":
													brickConfig.key !== getHighlightedBrick(),
											},
										)}
										onMouseOver={() => setHighlightedBrick(brickConfig.key)}
										onFocus={() => setHighlightedBrick(brickConfig.key)}
										onClick={() => {
											brickStore.get.addBrick({
												brickConfig: brickConfig,
											});
											props.state.setOpen(false);
										}}
										type="button"
									>
										<img
											src={brickIcon}
											alt={brickConfig.key}
											class="w-4 mr-2.5"
											loading="lazy"
										/>
										{helpers.getLocaleValue({
											value: brickConfig.details.name,
											fallback: brickConfig.key,
										})}
									</button>
								</li>
							)}
						</For>
					</ul>
				</div>
				{/* Preview */}
				<div class="w-[60%] p-4 h-full pl-0">
					<div class="border border-border bg-card-base h-full rounded-md flex items-center justify-center relative">
						<div class="w-[80%]">
							<Show
								when={highlightedBrick()?.preview?.image}
								fallback={
									<div class="flex items-center justify-center px-4 text-center">
										<FaSolidImage size={22} />
									</div>
								}
							>
								<BrickPreview
									data={{
										brick: {
											title: helpers.getLocaleValue({
												value: highlightedBrick()?.details.name,
												fallback: highlightedBrick()?.key,
											}),
											image: highlightedBrick()?.preview?.image,
										},
									}}
									options={{
										rounded: true,
									}}
								/>
							</Show>
						</div>
						<Show when={highlightedBrick()?.details.summary}>
							<div class="absolute top-4 right-4">
								<FormTooltip
									theme="inline"
									copy={helpers.getLocaleValue({
										value: highlightedBrick()?.details.summary,
										fallback: highlightedBrick()?.key,
									})}
								/>
							</div>
						</Show>
					</div>
				</div>
			</div>
		</Modal>
	);
};

export default AddBrick;
