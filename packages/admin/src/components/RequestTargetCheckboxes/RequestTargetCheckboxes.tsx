import type { Collection } from "@types";
import { type Component, For } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import { getTargetLabel } from "@/utils/requests";

/** Toggles request document targets while preserving the order of `options`. */
const RequestTargetCheckboxes: Component<{
	/** Prefixes each checkbox ID, so it stays unique per document. */
	id: string;
	options: string[];
	value: string[];
	collection: Collection | undefined;
	onChange: (targets: string[]) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="flex min-w-0 grow flex-wrap gap-2">
			<For each={props.options}>
				{(target) => (
					<Checkbox
						id={`${props.id}-${target}`}
						variant="button"
						label={getTargetLabel(props.collection, target)}
						value={props.value.includes(target)}
						onChange={(checked) =>
							props.onChange(
								props.options.filter((key) =>
									key === target ? checked : props.value.includes(key),
								),
							)
						}
					/>
				)}
			</For>
		</div>
	);
};

export default RequestTargetCheckboxes;
