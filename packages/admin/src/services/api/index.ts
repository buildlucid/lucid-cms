import auth from "./auth";
import account from "./account";
import users from "./users";
import userLogins from "./user-logins";
import roles from "./roles";
import permissions from "./permissions";
import media from "./media";
import mediaFolders from "./media-folders";
import mediaShareLinks from "./media-share-links";
import settings from "./settings";
import email from "./email";
import jobs from "./jobs";
import locales from "./locales";
import collections from "./collections";
import documents from "./documents";
import clientIntegrations from "./client-integrations";
import license from "./license";

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
