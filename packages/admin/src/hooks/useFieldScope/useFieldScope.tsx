import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";
import {
	createFieldScope,
	type FieldEnvironment,
	type FieldLevel,
} from "@/extensions/editor/field-scope";
import type { FieldScope } from "@/extensions/editor/types";
import { useBrickStore } from "@/hooks/useBrickStore/useBrickStore";
import { useDocumentLocalization } from "@/hooks/useDocumentLocalization/useDocumentLocalization";

type FieldScopeContextValue = {
	scope: FieldScope;
	environment: FieldEnvironment;
};

const FieldScopeContext = createContext<FieldScopeContextValue>();

/** Shares a level's fields with the field slots inside it. */
export const FieldScopeProvider: ParentComponent<{
	level: FieldLevel;
	environment: FieldEnvironment;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<FieldScopeContext.Provider
			value={{
				scope: createFieldScope(props.environment, props.level),
				environment: props.environment,
			}}
		>
			{props.children}
		</FieldScopeContext.Provider>
	);
};

/** The nearest level's fields: a repeater item or a brick's top level. Undefined outside a document's fields. */
export const useFieldScope = () => useContext(FieldScopeContext);

/** Builds the environment field handles share, from the pane's store and localization. */
export const useFieldEnvironment = (options: {
	contentLocale: Accessor<string>;
	collectionKey: Accessor<string | undefined>;
	/** Defaults to the document's locales. */
	locales?: Accessor<string[]>;
}): FieldEnvironment => {
	const store = useBrickStore();
	const localization = useDocumentLocalization();

	return {
		store,
		contentLocale: options.contentLocale,
		editableLocales: localization.editableLocales,
		locales: options.locales ?? localization.localeCodes,
		collectionKey: options.collectionKey,
	};
};
