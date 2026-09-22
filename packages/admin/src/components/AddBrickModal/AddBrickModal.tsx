import brickIconLight from "@assets/svgs/default-brick-icon-light.svg?url";
import brickIconDark from "@assets/svgs/default-brick-icon-white.svg?url";
import classNames from "classnames";
import {
	FaSolidImage,
	FaSolidMagnifyingGlass,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import BrickPreview from "@/components/BrickPreview/BrickPreview";
import { FormTooltip } from "@/components/FormTooltip/FormTooltip";
import Modal from "@/components/Modal/Modal";
import brickStore from "@/store/brickStore/brickStore";
import type { CollectionBrickConfig } from "@/types/collection-config";
import helpers from "@/utils/helpers";

interface AddBrickProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	data: {
		brickConfig: CollectionBrickConfig[];
	};
	callbacks?: {
		onSelect?: (brickConfig: CollectionBrickConfig) => void;
	};
}

const AddBrickModal: Component<AddBrickProps> = (props) => {
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
					value: brickConfig.details.label,
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
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			{/* Search */}
			<div class="h-14 w-full relative">
				<div class="absolute top-0 left-4 h-full flex items-center justify-center pointer-events-none">
					<FaSolidMagnifyingGlass class="w-4 text-muted" />
				</div>
				<input
					class="h-full bg-background w-full border-b border-border px-10 focus:outline-hidden text-title placeholder:text-muted"
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
						<FaSolidXmark class="w-4 text-danger" />
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
												"bg-card": brickConfig.key === getHighlightedBrick(),
												"bg-background":
													brickConfig.key !== getHighlightedBrick(),
											},
										)}
										onMouseOver={() => setHighlightedBrick(brickConfig.key)}
										onFocus={() => setHighlightedBrick(brickConfig.key)}
										onClick={() => {
											if (props.callbacks?.onSelect) {
												props.callbacks.onSelect(brickConfig);
											} else {
												brickStore.get.addBrick({
													brickConfig: brickConfig,
												});
											}
											props.state.setOpen(false);
										}}
										type="button"
									>
										<img
											src={brickIconLight}
											alt={brickConfig.key}
											class="mr-2.5 w-4 dark:hidden"
											loading="lazy"
										/>
										<img
											src={brickIconDark}
											alt=""
											aria-hidden="true"
											class="mr-2.5 hidden w-4 dark:block"
											loading="lazy"
										/>
										{helpers.getLocaleValue({
											value: brickConfig.details.label,
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
					<div class="border border-border bg-card h-full rounded-md flex items-center justify-center relative">
						<div class="w-[80%]">
							<Show
								when={highlightedBrick()?.thumbnail}
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
												value: highlightedBrick()?.details.label,
												fallback: highlightedBrick()?.key,
											}),
											image: highlightedBrick()?.thumbnail,
										},
									}}
									options={{
										rounded: true,
									}}
								/>
							</Show>
						</div>
						<Show when={highlightedBrick()?.details.description}>
							<div class="absolute top-4 right-4">
								<FormTooltip
									theme="inline"
									copy={helpers.getLocaleValue({
										value: highlightedBrick()?.details.description,
										fallback: highlightedBrick()?.key,
									})}
								/>
							</div>
						</Show>
					</div>
				</div>
			</div>
		</Modal.Root>
	);
};

export default AddBrickModal;
