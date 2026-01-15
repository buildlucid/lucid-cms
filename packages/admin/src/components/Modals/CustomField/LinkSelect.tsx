import type { LinkResValue } from "@lucidcms/core/types";
import { type Component, createEffect, createSignal } from "solid-js";
import { Input, Switch } from "@/components/Groups/Form";
import { Modal } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import T from "@/translations";

interface LinkSelectModalProps {
	state: {
		open: boolean;
		setOpen: (state: boolean) => void;
		selectedLink: LinkResValue;
	};
	callbacks: {
		onSelect: (link: LinkResValue) => void;
	};
}

const LinkSelectModal: Component<LinkSelectModalProps> = (props) => {
	// ------------------------------
	// State
	const [getLabel, setLabel] = createSignal<string>("");
	const [getUrl, setUrl] = createSignal<string>("");
	const [getOpenInNewTab, setOpenInNewTab] = createSignal<boolean>(false);

	// ----------------------------------
	// Functions
	const closeModal = () => {
		props.state.setOpen(false);
	};

	const updateLink = () => {
		props.callbacks.onSelect({
			url: getUrl(),
			target: getOpenInNewTab() ? "_blank" : "_self",
			label: getLabel(),
		});
		closeModal();
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		setLabel(props.state.selectedLink?.label || "");
		setOpenInNewTab(props.state.selectedLink?.target === "_blank");
		setUrl(props.state.selectedLink?.url || "");
	});

	// ------------------------------
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
						id="label"
						value={getLabel()}
						onChange={(value) => setLabel(value)}
						name={"label"}
						type="text"
						copy={{
							label: T()("label"),
						}}
						required={false}
					/>
					<Input
						id="url"
						value={getUrl()}
						onChange={(value) => setUrl(value)}
						name={"url"}
						type="text"
						copy={{
							label: T()("url"),
						}}
						required={false}
					/>
					<Switch
						id="open_in_new_tab"
						value={getOpenInNewTab()}
						onChange={(value) => setOpenInNewTab(value)}
						name={"open_in_new_tab"}
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

export default LinkSelectModal;
