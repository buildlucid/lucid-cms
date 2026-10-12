import type { MediaGenerationModels, MediaGenerationType } from "@types";
import { type Component, createSignal } from "solid-js";
import ModelPicker from "@/components/ModelPicker/ModelPicker";

/** Selects a generation model beside the send button and closes after selection. */
const GenerationModelPicker: Component<{
	/** Groups the model radios, so each form needs its own. */
	name: string;
	models?: MediaGenerationModels[MediaGenerationType][];
	value?: string;
	onSelect: (_modelId: string) => void;
	loading: boolean;
	error: boolean;
	onRetry: () => void;
	disabled: boolean;
}> = (props) => {
	// -----------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);

	// -----------------------------
	// Render
	return (
		<ModelPicker
			name={props.name}
			models={props.models}
			value={props.value}
			onSelect={(modelId) => {
				props.onSelect(modelId);
				setOpen(false);
			}}
			open={open()}
			onOpenChange={setOpen}
			loading={props.loading}
			error={props.error}
			onRetry={props.onRetry}
			disabled={props.disabled}
		/>
	);
};

export default GenerationModelPicker;
