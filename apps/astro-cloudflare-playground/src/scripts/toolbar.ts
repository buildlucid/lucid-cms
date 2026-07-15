import { setupToolbar } from "@lucidcms/client/toolbar";

const {
	lucidEditCollection,
	lucidEditDocument,
	lucidEditStatus,
	lucidEditVersion,
} = document.body.dataset;
const documentId = Number(lucidEditDocument);
const versionId = Number(lucidEditVersion);

const toolbar = setupToolbar({
	edit:
		lucidEditCollection && Number.isInteger(documentId)
			? {
					collectionKey: lucidEditCollection,
					documentId,
					status: lucidEditStatus || undefined,
					versionId: Number.isInteger(versionId) ? versionId : undefined,
				}
			: undefined,
	preview: false,
});

window.addEventListener("pagehide", toolbar.cleanup, { once: true });
