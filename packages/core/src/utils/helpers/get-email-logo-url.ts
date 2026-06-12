import emailConstants from "../../constants/emails.js";
import type { ServiceContext } from "../services/types.js";
import getBaseUrl from "./get-base-url.js";

const getEmailLogoUrl = (context: ServiceContext): string => {
	return `${getBaseUrl(context)}${emailConstants.assets.logo}`;
};

export default getEmailLogoUrl;
