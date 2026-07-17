import { setupToolbar } from "@lucidcms/client/toolbar";

const {
	lucidEditCollection,
	lucidEditDocument,
	lucidEditVersion,
	lucidEditVersionId,
} = document.body.dataset;
const documentId = Number(lucidEditDocument);
const versionId = Number(lucidEditVersionId);

const toolbar = setupToolbar({
	edit:
		lucidEditCollection && Number.isInteger(documentId)
			? {
					collectionKey: lucidEditCollection,
					documentId,
					version: lucidEditVersion || undefined,
					versionId: Number.isInteger(versionId) ? versionId : undefined,
				}
			: undefined,
	preview: false,
});

window.addEventListener("pagehide", toolbar.cleanup, { once: true });
