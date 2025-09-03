import { type Component, Show, createMemo } from "solid-js";
import { Modal } from "@/components/Groups/Modal";
import BrickPreview from "@/components/Partials/BrickPreview";
import brickStore from "@/store/brickStore";
import { Dialog } from "@kobalte/core";
import { FaSolidXmark } from "solid-icons/fa";

const BrickImagePreview: Component = (props) => {
	// ----------------------------------
	// Memos
	const open = createMemo(() => brickStore.get.imagePreview.open);
	const selectedBrick = createMemo(() => brickStore.get.imagePreview.data);

	// ------------------------------
	// Render
	return (
		<Modal
			state={{
				open: open(),
				setOpen: (state) => {
					brickStore.set("imagePreview", {
						open: state,
						data: brickStore.get.imagePreview.data,
					});
				},
			}}
			options={{
				noPadding: true,
			}}
		>
			<div class="flex items-baseline justify-between p-4 md:p-6 border-b border-border">
				<div class="flex flex-col">
					<Dialog.Title>{selectedBrick()?.title}</Dialog.Title>
					<Show when={selectedBrick()?.description}>
						<Dialog.Description class="mt-1 text-sm">
							{selectedBrick()?.description}
						</Dialog.Description>
					</Show>
				</div>
				<Dialog.CloseButton class="h-8 w-8 min-w-[32px] rounded-full flex justify-center items-center text-body hover:text-title duration-200 transition-colors">
					<FaSolidXmark />
				</Dialog.CloseButton>
			</div>
			<div class="p-4 md:p-6">
				<BrickPreview
					data={{
						brick: selectedBrick(),
					}}
					options={{
						rounded: true,
					}}
				/>
			</div>
		</Modal>
	);
};

export default BrickImagePreview;
