import { type Component, createEffect, createSignal } from "solid-js";
import { Input, Switch } from "@/components/Groups/Form";
import { Modal } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import T from "@/translations";

const LinkModal: Component<{
	state: {
		open: boolean;
		setOpen: (open: boolean) => void;
		initialLabel: string;
		initialUrl: string;
		initialOpenInNewTab: boolean;
	};
	callbacks: {
		onUpdate: (values: {
			label: string;
			url: string;
			openInNewTab: boolean;
		}) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const [label, setLabel] = createSignal("");
	const [url, setUrl] = createSignal("");
	const [openInNewTab, setOpenInNewTab] = createSignal(false);

	// ----------------------------------------
	// Functions
	const closeModal = () => props.state.setOpen(false);
	const updateLink = () => {
		props.callbacks.onUpdate({
			label: label(),
			url: url(),
			openInNewTab: openInNewTab(),
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		setLabel(props.state.initialLabel);
		setUrl(props.state.initialUrl);
		setOpenInNewTab(props.state.initialOpenInNewTab);
	});

	// ----------------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: closeModal,
			}}
		>
			<div class="flex flex-col gap-6">
				<div class="flex flex-col gap-0">
					<Input
						id="rich_text_link_label"
						value={label()}
						onChange={(value) => setLabel(value)}
						name="label"
						type="text"
						copy={{
							label: T()("label"),
						}}
						required={false}
					/>
					<Input
						id="rich_text_link_url"
						value={url()}
						onChange={(value) => setUrl(value)}
						name="url"
						type="text"
						copy={{
							label: T()("url"),
						}}
						required={false}
					/>
					<Switch
						id="rich_text_open_in_new_tab"
						value={openInNewTab()}
						onChange={(value) => setOpenInNewTab(value)}
						name="open_in_new_tab"
						copy={{
							label: T()("open_in_new_tab"),
							true: T()("yes"),
							false: T()("no"),
						}}
						required={false}
						hideOptionalText
						labelLeft
					/>
				</div>
				<div class="w-full flex gap-2.5">
					<Button
						type="button"
						theme="primary"
						size="medium"
						onClick={updateLink}
					>
						{T()("update")}
					</Button>
					<Button
						type="button"
						theme="border-outline"
						size="medium"
						onClick={closeModal}
					>
						{T()("cancel")}
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default LinkModal;
