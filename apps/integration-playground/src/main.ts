import "./style.css";
import "./pages/search/style.css";
import { element } from "./dom";
import { initializeOAuth } from "./pages/oauth";
import oauthView from "./pages/oauth/view.html?raw";
import { initializeSearch } from "./pages/search";
import searchView from "./pages/search/view.html?raw";

const pages = element("pages", HTMLElement);
pages.innerHTML = `${oauthView}${searchView}`;
const getOAuthSession = initializeOAuth();
initializeSearch({ getOAuthSession });

const showPage = () => {
	const page = window.location.hash === "#search" ? "search" : "oauth";
	element("oauth-page", HTMLElement).hidden = page !== "oauth";
	element("search-page", HTMLElement).hidden = page !== "search";
	element("server-state", HTMLDivElement).hidden = page !== "oauth";
	for (const link of document.querySelectorAll<HTMLAnchorElement>(
		".page-nav a",
	)) {
		if (link.dataset.page === page) link.setAttribute("aria-current", "page");
		else link.removeAttribute("aria-current");
	}
	document.title = `${page === "search" ? "Search" : "OAuth"} · Lucid Integration Playground`;
};
window.addEventListener("hashchange", showPage);
showPage();
