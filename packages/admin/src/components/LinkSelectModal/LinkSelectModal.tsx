import type { LinkResValue } from "@types";
import { type Component, createEffect, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Switch } from "@/components/Switch/Switch";
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
	const linkIsEmpty = (link: LinkResValue) =>
		!link?.url?.trim() && !link?.label?.trim();
	const updateLink = () => {
		const updatedLink: NonNullable<LinkResValue> = {
			url: getUrl(),
			target: getOpenInNewTab() ? "_blank" : "_self",
			label: getLabel(),
		};

		if (linkIsEmpty(updatedLink) && linkIsEmpty(props.state.selectedLink)) {
			closeModal();
			return;
		}

		props.callbacks.onSelect(updatedLink);
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
		<Modal.Root open={props.state.open} onOpenChange={closeModal}>
			<Modal.Body>
				<div class="flex flex-col gap-3">
					<Input
						id="label"
						value={getLabel()}
						onChange={(value) => setLabel(value)}
						name={"label"}
						type="text"
						label={T()("common.label")}
						required={false}
					/>
					<Input
						id="url"
						value={getUrl()}
						onChange={(value) => setUrl(value)}
						name={"url"}
						type="text"
						label={T()("common.url")}
						required={false}
					/>
					<Switch
						id="open_in_new_tab"
						value={getOpenInNewTab()}
						onChange={(value) => setOpenInNewTab(value)}
						name={"open_in_new_tab"}
						label={T()("common.open.in.new.tab")}
						trueLabel={T()("common.yes")}
						falseLabel={T()("common.no")}
						required={false}
					/>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Modal.Actions>
					<Button
						type="button"
						variant="outline"
						size="md"
						onClick={closeModal}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={updateLink}
					>
						{T()("common.update")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default LinkSelectModal;
