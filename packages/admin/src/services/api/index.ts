import account from "./account";
import auth from "./auth";
import clientIntegrations from "./client-integrations";
import collections from "./collections";
import documents from "./documents";
import email from "./email";
import jobs from "./jobs";
import license from "./license";
import locales from "./locales";
import media from "./media";
import mediaFolders from "./media-folders";
import mediaShareLinks from "./media-share-links";
import permissions from "./permissions";
import roles from "./roles";
import settings from "./settings";
import userLogins from "./user-logins";
import users from "./users";

const exportObject = {
	auth,
	account,
	users,
	userLogins,
	roles,
	permissions,
	media,
	mediaFolders,
	mediaShareLinks,
	settings,
	email,
	jobs,
	locales,
	collections,
	documents,
	clientIntegrations,
	license,
};

export default exportObject;
