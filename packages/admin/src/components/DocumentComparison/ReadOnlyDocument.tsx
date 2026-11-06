import type { InternalCollectionDocument, Refs } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { BuilderBricks } from "@/components/BuilderBricks/BuilderBricks";
import { CollectionPseudoBrick } from "@/components/CollectionPseudoBrick/CollectionPseudoBrick";
import { FixedBricks } from "@/components/FixedBricks/FixedBricks";
import { BrickStoreProvider } from "@/hooks/useBrickStore/useBrickStore";
import { DocumentLocaleOverride } from "@/hooks/useDocumentLocalization/useDocumentLocalization";
import {
	ReadOnlyBuilderStateProvider,
	usePageBuilderState,
} from "@/hooks/usePageBuilderState/usePageBuilderState";
import type { createBrickStore } from "@/store/brickStore/brickStore";

/** Reuses field presentation with isolated content and no save or editing lifecycle. */
const ReadOnlyDocument: Component<{
	store: ReturnType<typeof createBrickStore>;
	document: Accessor<InternalCollectionDocument>;
	refs: Accessor<Refs | undefined>;
	/** Shows the content in this locale instead of the editor's, eg. the source text beside a translation. */
	contentLocale?: Accessor<string | undefined>;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const { documentState } = usePageBuilderState();

	// ----------------------------------------
	// Memos
	const collection = createMemo(() => documentState?.collection());

	// ----------------------------------------
	// Render
	return (
		<BrickStoreProvider store={props.store}>
			<ReadOnlyBuilderStateProvider document={props.document} refs={props.refs}>
				<DocumentLocaleOverride locale={() => props.contentLocale?.()}>
					<CollectionPseudoBrick
						fields={collection()?.fields ?? []}
						collectionMigrationStatus={collection()?.migrationStatus}
						collectionKey={collection()?.key}
						documentId={props.document().id}
						hasFollowingSection={
							(collection()?.fixedBricks.length ?? 0) > 0 ||
							(collection()?.builderBricks.length ?? 0) > 0
						}
					/>
					<FixedBricks
						brickConfig={collection()?.fixedBricks ?? []}
						collectionMigrationStatus={collection()?.migrationStatus}
						collectionKey={collection()?.key}
						documentId={props.document().id}
						hasFollowingSection={(collection()?.builderBricks.length ?? 0) > 0}
					/>
					<BuilderBricks
						brickConfig={collection()?.builderBricks ?? []}
						collectionMigrationStatus={collection()?.migrationStatus}
						collectionKey={collection()?.key}
						documentId={props.document().id}
					/>
				</DocumentLocaleOverride>
			</ReadOnlyBuilderStateProvider>
		</BrickStoreProvider>
	);
};

export default ReadOnlyDocument;
