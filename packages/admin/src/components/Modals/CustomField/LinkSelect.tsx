import T from "@/translations";
import {
	type Component,
	createMemo,
	createSignal,
	createEffect,
} from "solid-js";
import linkFieldStore from "@/store/forms/linkFieldStore";
import { Modal } from "@/components/Groups/Modal";
import { Checkbox, Input } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";

const LinkSelect: Component = () => {
	// ------------------------------
	// State
	const [getLabel, setLabel] = createSignal<string>("");
	const [getUrl, setUrl] = createSignal<string>("");
	const [getOpenInNewTab, setOpenInNewTab] = createSignal<boolean>(false);

	// ----------------------------------
	// Memos
	const open = createMemo(() => linkFieldStore.get.open);
	const selectedLink = createMemo(() => linkFieldStore.get.selectedLink);

	// ----------------------------------
	// Functions
	const updateLink = () => {
		linkFieldStore.get.onSelectCallback({
			url: getUrl(),
			target: getOpenInNewTab() ? "_blank" : "_self",
			label: getLabel(),
		});
		linkFieldStore.set("open", false);
		linkFieldStore.set("selectedLink", null);
	};

	// ----------------------------------
	// Effects
	createEffect(() => {
		setLabel(selectedLink()?.label || "");
		setOpenInNewTab(selectedLink()?.target === "_blank");
		setUrl(selectedLink()?.url || "");
	});

	// ------------------------------
	// Render
	return (
		<Modal
			state={{
				open: open(),
				setOpen: () => {
					linkFieldStore.set("open", false);
					linkFieldStore.set("selectedLink", null);
				},
			}}
			options={{
				noPadding: true,
			}}
		>
			<div class="p-6">
				<div class="mb-6 pb-6 border-b border-border">
					<h2>{T()("set_link")}</h2>
				</div>
				<div class="mb-6 pb-6 border-b border-border">
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
					<Checkbox
						id="open_in_new_tab"
						value={getOpenInNewTab()}
						onChange={(value) => setOpenInNewTab(value)}
						name={"open_in_new_tab"}
						copy={{
							label: T()("open_in_new_tab"),
						}}
						required={false}
					/>
				</div>

				<div class="w-full flex gap-4 mt-6">
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
						onClick={() => {
							linkFieldStore.set("open", false);
							linkFieldStore.set("selectedLink", null);
						}}
					>
						{T()("cancel")}
					</Button>
				</div>
			</div>
		</Modal>
	);
};

export default LinkSelect;
