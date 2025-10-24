import account from "./account/index.js";
import auth from "./auth/index.js";
import cdn from "./cdn/index.js";
import clientIntegrations from "./client-integrations/index.js";
import collections from "./collections/index.js";
import crons from "./crons/index.js";
import documents from "./documents/index.js";
import documentBricks from "./documents-bricks/index.js";
import documentVersions from "./documents-versions/index.js";
import emails from "./email/index.js";
import fs from "./fs/index.js";
import jobs from "./jobs/index.js";
import license from "./license/index.js";
import locales from "./locales/index.js";
import media from "./media/index.js";
import mediaFolders from "./media-folders/index.js";
import mediaShareLinks from "./media-share-links/index.js";
import options from "./options/index.js";
import permissions from "./permissions/index.js";
import processedImages from "./processed-images/index.js";
import roles from "./roles/index.js";
import seed from "./seed/index.js";
import settings from "./settings/index.js";
import sync from "./sync/index.js";
import userLogins from "./user-logins/index.js";
import userTokens from "./user-tokens/index.js";
import users from "./users/index.js";

const services = {
	auth,
	account,
	collections,
	documents,
	documentVersions,
	documentBricks,
	users,
	userTokens,
	userLogins,
	emails,
	jobs,
	roles,
	permissions,
	settings,
	license,
	options,
	media,
	mediaFolders,
	mediaShareLinks,
	processedImages,
	cdn,
	locales,
	crons,
	seed,
	sync,
	clientIntegrations,
	fs,
};

export default services;
