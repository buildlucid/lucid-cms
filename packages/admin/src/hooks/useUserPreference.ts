import { type Accessor, createEffect, createSignal } from "solid-js";

type UseUserPreferenceProps<T> = {
	defaultValue: T | Accessor<T>;
	setValue: (value: T) => void;
	value: Accessor<T | undefined>;
};

/** Resolves either a static or reactive default value. */
const resolveDefaultValue = <T>(value: T | Accessor<T>): T => {
	return typeof value === "function" ? (value as Accessor<T>)() : value;
};

/** Creates a reactive preference accessor with a fallback for unset values. */
export const useUserPreference = <T>(props: UseUserPreferenceProps<T>) => {
	const getResolvedValue = () =>
		props.value() ?? resolveDefaultValue(props.defaultValue);
	const [value, setValue] = createSignal<T>(getResolvedValue());

	createEffect(() => {
		const nextValue = getResolvedValue();
		setValue(() => nextValue);
	});

	/** Updates local state and persists the preference. */
	const updateValue = (nextValue: T) => {
		setValue(() => nextValue);
		props.setValue(nextValue);
	};

	return [value, updateValue] as const;
};

export default useUserPreference;
