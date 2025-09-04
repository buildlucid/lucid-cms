import T from "@/translations";
import { type Component, createSignal, createEffect, Show } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import Spinner from "@/components/Partials/Spinner";

interface SearchProps {
	value: string;
	onChange: (_value: string) => void;
	isLoading: boolean;
}

export const Search: Component<SearchProps> = (props) => {
	// ----------------------------------------
	// State
	const [debouncedValue, setDebouncedValue] = createSignal("");

	// ----------------------------------------
	// Functions
	const setSearchQuery = debounce((value: string) => {
		setDebouncedValue(value);
	}, 500);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		props.onChange(debouncedValue());
	});

	// -------------------------------
	// Render
	return (
		<div class="relative w-full">
			<input
				type="text"
				class="bg-input-base px-2 rounded-md w-full border border-border text-sm text-title font-medium h-10 focus:outline-hidden focus:border-primary-base"
				placeholder={T()("search")}
				value={props.value}
				onKeyDown={(e) => {
					e.stopPropagation();
				}}
				onInput={(e) => setSearchQuery(e.currentTarget.value)}
			/>
			<Show when={props.isLoading}>
				<div class="absolute right-2 top-0 bottom-0 flex items-center">
					<Spinner size="sm" />
				</div>
			</Show>
		</div>
	);
};
