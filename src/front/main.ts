import { addRoute, createRouter, findRoute } from "rou3";
import van from "vanjs-core";
import "./main.css";

import AddPage from "./AddPage";
import DashboardPage from "./DashboardPage";
import EditPage from "./EditPage";
import Header from "./Header";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import NotFoundPage from "./NotFoundPage";
import SettingPage from "./SettingPage";
import { authUser, jumpPath, page, routerParam } from "./utils";

const { div } = van.tags;

// Shared state and utilities
export interface Receipt {
	id: number;
	userId: number;
	type: string;
	storeName: string | null;
	datetime: string;
	imageUrl: string | null;
	totalAmount: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

// Sync authUser state with localStorage
van.derive(() => {
	if (authUser.val) {
		localStorage.setItem("authUser", JSON.stringify(authUser.val));
	} else {
		localStorage.removeItem("authUser");
	}
});

// Function to verify session with the backend
const verifySession = async () => {
	if (!authUser.val) return;
	try {
		const response = await fetch("/api/me");
		if (!response.ok) throw new Error("Session invalid");
		authUser.val = await response.json();
	} catch (error) {
		authUser.val = null;
	}
};
verifySession();

window.addEventListener("popstate", () => {
	page.val = location.pathname;
});

const router = createRouter<() => HTMLElement>();
addRoute(router, undefined, "/", HomePage);
addRoute(router, undefined, "/login", LoginPage);
addRoute(router, undefined, "/dashboard", DashboardPage);
addRoute(router, undefined, "/add", AddPage);
addRoute(router, undefined, "/settings", SettingPage);
addRoute(router, undefined, "/edit/:id", EditPage);
const notFoundPath = "/404";
addRoute(router, undefined, notFoundPath, NotFoundPage);

const isAuthenticated = van.derive(() => {
	return authUser.val !== null;
});

const App = () => {
	const path = page.val;

	if (path === "/login") {
		if (isAuthenticated.val) {
			jumpPath("/dashboard");
			return div("Already logged in. Redirecting...");
		}
	} else if (["/404", "/"].includes(path)) {
		// ignore
	} else if (!isAuthenticated.val) {
		jumpPath("/login");
		return div("Redirecting to login...");
	}

	const route = findRoute(router, undefined, path);
	if (route) {
		console.log(route);
		routerParam.val = route.params || {};
		return div(route.data);
	}
	jumpPath(notFoundPath);
	return "";
};

van.add(document.body, Header, App);
