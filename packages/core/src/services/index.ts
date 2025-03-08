import auth from "./auth/index.js";
import account from "./account/index.js";
import cdn from "./cdn/index.js";
import collectionDocumentBricks from "./collection-document-bricks/index.js";
import collectionDocuments from "./collection-documents/index.js";
import collectionDocumentVersions from "./collection-document-versions/index.js";
import documents from "./documents/index.js";
import documentVersions from "./documents-versions/index.js";
import documentBricks from "./documents-bricks/index.js";
import collections from "./collections/index.js";
import emails from "./email/index.js";
import locales from "./locales/index.js";
import media from "./media/index.js";
import options from "./options/index.js";
import processedImage from "./processed-images/index.js";
import roles from "./roles/index.js";
import settings from "./settings/index.js";
import translations from "./translations/index.js";
import users from "./users/index.js";
import userTokens from "./user-tokens/index.js";
import permissions from "./permissions/index.js";
import crons from "./crons/index.js";
import seed from "./seed/index.js";
import start from "./start/index.js";
import clientIntegrations from "./client-integrations/index.js";
import collectionMigrator from "./collection-migrator/index.js";

const lucidServices = {
	auth: auth,
	collection: {
		...collections,
		documents: documents,
		documentVersions: documentVersions,
		documentBricks: documentBricks,
		migrator: collectionMigrator,
		// TODO: remove bellow object after document rework is complete
		document: {
			...collectionDocuments,
			versions: collectionDocumentVersions,
			brick: collectionDocumentBricks,
		},
	},
	account: account,
	user: {
		...users,
		token: userTokens,
	},
	email: emails,
	role: roles,
	setting: settings,
	option: options,
	media: media,
	processedImage: processedImage,
	cdn: cdn,
	locale: locales,
	translation: translations,
	crons: crons,
	permission: permissions,
	seed: seed,
	start: start,
	clientIntegrations: clientIntegrations,
};

export default lucidServices;
