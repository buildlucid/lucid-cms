import type { PublishOperation } from "@types";
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
	releaseRequest?: Accessor<PublishOperation | undefined>;
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
					releaseRequest: props.releaseRequest,
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
