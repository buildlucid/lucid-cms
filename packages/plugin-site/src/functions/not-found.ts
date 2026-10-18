import { SiteNotFoundError } from "../errors.js";

const notFound = (): never => {
	throw new SiteNotFoundError();
};

export default notFound;
