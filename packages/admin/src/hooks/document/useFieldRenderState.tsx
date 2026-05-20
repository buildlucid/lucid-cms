import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";

type FieldRenderStateContextValue = {
	brickIndex: Accessor<number>;
	contentLocale: Accessor<string>;
	contentLocales: Accessor<string[]>;
	missingFieldColumns: Accessor<string[]>;
};

const FieldRenderStateContext = createContext<FieldRenderStateContextValue>({
	brickIndex: () => -1,
	contentLocale: () => contentLocaleStore.get.contentLocale ?? "",
	contentLocales: () =>
		contentLocaleStore.get.locales.map((locale) => locale.code) || [],
	missingFieldColumns: () => [],
});

export const FieldRenderStateProvider: ParentComponent<
	FieldRenderStateContextValue
> = (props) => {
	return (
		<FieldRenderStateContext.Provider
			value={{
				brickIndex: props.brickIndex,
				contentLocale: props.contentLocale,
				contentLocales: props.contentLocales,
				missingFieldColumns: props.missingFieldColumns,
			}}
		>
			{props.children}
		</FieldRenderStateContext.Provider>
	);
};

export const useFieldRenderState = () => {
	return useContext(FieldRenderStateContext);
};
