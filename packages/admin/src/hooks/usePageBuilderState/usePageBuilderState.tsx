import type { InternalCollectionDocument, Refs, RequestDetail } from "@types";
import {
	type Accessor,
	createContext,
	type ParentComponent,
	useContext,
} from "solid-js";

import type { UseDocumentAutoSave } from "../useDocumentAutoSave/useDocumentAutoSave";
import { DocumentLocalizationProvider } from "../useDocumentLocalization/useDocumentLocalization";
import type { UseDocumentMutations } from "../useDocumentMutations/useDocumentMutations";
import type { UseDocumentState } from "../useDocumentState/useDocumentState";
import type { UseDocumentUIState } from "../useDocumentUIState/useDocumentUIState";
import type { UseNavigationGuard } from "../useNavigationGuard/useNavigationGuard";

export type PageBuilderStateContextValue = {
	mode: "create" | "edit";
	version: Accessor<string>;
	versionId: Accessor<number | undefined>;
	relationVersionType: Accessor<string | undefined>;
	request?: Accessor<RequestDetail | undefined>;
	disableWorkflow: Accessor<boolean>;
	documentState: UseDocumentState;
	mutations: UseDocumentMutations;
	uiState: UseDocumentUIState;
	autoSave: UseDocumentAutoSave;
	navigationGuard: UseNavigationGuard;
};

const PageBuilderStateContext =
	createContext<Partial<PageBuilderStateContextValue>>();

export const PageBuilderStateProvider: ParentComponent<
	PageBuilderStateContextValue
> = (props) => {
	return (
		<DocumentLocalizationProvider collection={props.documentState.collection}>
			<PageBuilderStateContext.Provider
				value={{
					mode: props.mode,
					version: props.version,
					versionId: props.versionId,
					relationVersionType: props.relationVersionType,
					request: props.request,
					disableWorkflow: props.disableWorkflow,
					documentState: props.documentState,
					mutations: props.mutations,
					uiState: props.uiState,
					autoSave: props.autoSave,
					navigationGuard: props.navigationGuard,
				}}
			>
				{props.children}
			</PageBuilderStateContext.Provider>
		</DocumentLocalizationProvider>
	);
};

export const usePageBuilderState = () => {
	return useContext(PageBuilderStateContext) ?? {};
};

/** Gives read-only field extensions the displayed document, without access to save mutations. */
export const ReadOnlyBuilderStateProvider: ParentComponent<{
	document: Accessor<InternalCollectionDocument>;
	refs: Accessor<Refs | undefined>;
}> = (props) => {
	const state = usePageBuilderState();
	if (!state.documentState) {
		throw new Error("Read-only documents require page builder state.");
	}

	const documentState = {
		...state.documentState,
		document: props.document,
		refs: props.refs,
	};

	return (
		<PageBuilderStateContext.Provider
			value={{
				...state,
				documentState,
				version: () => props.document().version ?? "snapshot",
				versionId: () => props.document().versionId ?? undefined,
				relationVersionType: () =>
					props.document().version === "proposal"
						? "latest"
						: (props.document().version ?? undefined),
				mutations: undefined,
				autoSave: undefined,
				uiState: undefined,
				request: undefined,
				disableWorkflow: () => true,
			}}
		>
			{props.children}
		</PageBuilderStateContext.Provider>
	);
};
