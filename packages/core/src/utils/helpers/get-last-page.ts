/** The last page of a list of `total` matches; a `perPage` of -1 puts every match on one page. */
const getLastPage = (total: number, perPage: number): number =>
	perPage === -1 ? (total > 0 ? 1 : 0) : Math.ceil(total / perPage);

export default getLastPage;
