import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";

/** Where a field's translation in the open locale stands: written by the translation feature, or made from older source text. */
export type FieldTranslationState = "machine" | "outdated";

type FieldTranslationContextValue = {
	state: Accessor<FieldTranslationState | null>;
	/** Records the translation as checked against the current source text. Undefined when the field can't be changed. */
	markChecked?: () => void;
};

const FieldTranslationContext = createContext<FieldTranslationContextValue>({
	state: () => null,
});

export const FieldTranslationProvider: ParentComponent<
	FieldTranslationContextValue
> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<FieldTranslationContext.Provider
			value={{
				state: () => props.state(),
				get markChecked() {
					return props.markChecked;
				},
			}}
		>
			{props.children}
		</FieldTranslationContext.Provider>
	);
};

/** Returns the nearest field's translation state, for markers beside its label. */
export const useFieldTranslation = () => {
	return useContext(FieldTranslationContext);
};
