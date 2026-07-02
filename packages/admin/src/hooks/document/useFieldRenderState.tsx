import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";

type FieldRenderStateContextValue = {
	brickIndex: Accessor<number>;
	collectionKey: Accessor<string | undefined>;
	brickKey: Accessor<string | undefined>;
	contentLocale: Accessor<string>;
	defaultLocale: Accessor<string>;
	contentLocales: Accessor<string[]>;
	missingFieldColumns: Accessor<string[]>;
};

const FieldRenderStateContext = createContext<FieldRenderStateContextValue>({
	brickIndex: () => -1,
	collectionKey: () => undefined,
	brickKey: () => undefined,
	contentLocale: () => contentLocaleStore.get.contentLocale ?? "",
	defaultLocale: () =>
		contentLocaleStore.get.locales.find((locale) => locale.isDefault)?.code ??
		contentLocaleStore.get.locales[0]?.code ??
		"en",
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
				collectionKey: props.collectionKey,
				brickKey: props.brickKey,
				contentLocale: props.contentLocale,
				defaultLocale: props.defaultLocale,
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
