import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";

type FieldRenderStateContextValue = {
	brickOrder: Accessor<number | undefined>;
	brickIndex: Accessor<number>;
	brickRef: Accessor<string | undefined>;
	collectionKey: Accessor<string | undefined>;
	brickKey: Accessor<string | undefined>;
	documentId: Accessor<number | undefined>;
	contentLocale: Accessor<string>;
	defaultLocale: Accessor<string>;
	contentLocales: Accessor<string[]>;
	missingFieldColumns: Accessor<string[]>;
};

const FieldRenderStateContext = createContext<FieldRenderStateContextValue>({
	brickOrder: () => undefined,
	brickIndex: () => -1,
	brickRef: () => undefined,
	collectionKey: () => undefined,
	brickKey: () => undefined,
	documentId: () => undefined,
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
	const value: FieldRenderStateContextValue = {
		brickOrder: props.brickOrder,
		brickIndex: props.brickIndex,
		brickRef: props.brickRef,
		collectionKey: props.collectionKey,
		brickKey: props.brickKey,
		documentId: props.documentId,
		contentLocale: props.contentLocale,
		defaultLocale: props.defaultLocale,
		contentLocales: props.contentLocales,
		missingFieldColumns: props.missingFieldColumns,
	};

	return (
		<FieldRenderStateContext.Provider value={value}>
			{props.children}
		</FieldRenderStateContext.Provider>
	);
};

export const useFieldRenderState = () => {
	return useContext(FieldRenderStateContext);
};
