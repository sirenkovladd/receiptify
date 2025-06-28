import { addRoute, createRouter, findRoute } from "rou3";
import van from "vanjs-core";
import "./main.css";

const { div, h1, p, button, input, form, label, nav, a } = van.tags;

// Initialize authUser from localStorage
const getStoredUser = () => {
	try {
		const user = localStorage.getItem("authUser");
		return user ? JSON.parse(user) : null;
	} catch (e) {
		return null;
	}
};

const authUser = van.state<{ name: string } | null>(getStoredUser());

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
	if (!authUser.val) return; // No need to verify if no user is stored
	try {
		const response = await fetch("/api/me"); // Endpoint to get current user info
		if (!response.ok) throw new Error("Session invalid");
		authUser.val = await response.json(); // Update with fresh data
	} catch (error) {
		authUser.val = null; // Clear user state if session is no longer valid
	}
};
verifySession(); // Verify session on initial load

const page = van.state(location.pathname);
window.addEventListener("popstate", () => {
	page.val = location.pathname;
});

// Page Components

const jumpPath = (path: string) => {
	window.history.pushState({}, "", path);
	setTimeout(() => {
		page.val = path;
	});
};

const NavLink = (path: string, text: string) =>
	a(
		{
			href: path,
			onclick: (e: Event) => {
				e.preventDefault();
				jumpPath(path);
			},
			class: () => (page.val === path ? "active" : ""),
		},
		text,
	);

const Header = () => {
	return nav(
		NavLink("/", "Home"),
		() => (authUser.val ? '' : NavLink("/login", "Login")),
		() => (authUser.val ? NavLink("/dashboard", "Dashboard") : ''),
		() => (authUser.val ? NavLink("/add", "Add Receipt") : ''),
		() =>
			authUser.val
				? a(
						{
							href: "#",
							onclick: async (e: Event) => {
								e.preventDefault();
								try {
									await fetch("/api/logout", { method: "POST" });
									authUser.val = null;
									jumpPath("/");
								} catch (error) {
									console.error("Logout failed:", error);
								}
							},
						},
						"Logout",
				  )
				: '',
	);
};

const HomePage = () =>
	div(
		h1("Welcome to Receiptify!"),
		p("Upload your receipts and manage your expenses with ease."),
	);

const LoginPage = () => {
	const email = van.state("");
	const password = van.state("");
	const error = van.state("");

	const handleLogin = async (e: Event) => {
		e.preventDefault();
		error.val = "";
		try {
			const response = await fetch("/api/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: email.val, password: password.val }),
			});
			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.message || "Login failed");
			}
			authUser.val = await response.json();
			jumpPath("/dashboard");
		} catch (err: any) {
			error.val = err.message || "An error occurred.";
		}
	};

	return div(
		h1("Login"),
		form(
			{ onsubmit: handleLogin },
			() => (error.val ? p({ class: "error" }, error.val) : ""),
			div(
				label("Email"),
				input({ type: "email", oninput: (e) => (email.val = (e.target as HTMLInputElement).value) }),
			),
			div(
				label("Password"),
				input({
					type: "password",
					oninput: (e) => (password.val = (e.target as HTMLInputElement).value),
				}),
			),
			button({ type: "submit" }, "Login"),
		),
	);
};

const DashboardPage = () =>
	div(
		h1("Dashboard"),
		p("Here are your saved transactions."),
		// Transaction list will go here
	);

const AddPage = () => {
	const fileInput = input({ type: "file", accept: "image/*" });
	const statusMessage = van.state("");

	const handleUpload = async (e: Event) => {
		e.preventDefault();
		const file = (fileInput as HTMLInputElement).files?.[0];
		if (!file) {
			statusMessage.val = "Please select a file to upload.";
			return;
		}
		statusMessage.val = "Uploading and analyzing...";
		const formData = new FormData();
		formData.append("receipt", file);

		try {
			const response = await fetch("/api/receipts/analyze", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error((await response.json()).message);
			const result = await response.json();
			statusMessage.val = `Analysis complete! Total: ${result.total}`;
		} catch (error: any) {
			statusMessage.val = `Error: ${error.message || "Analysis failed."}`;
		}
	};

	return div(
		h1("Add New Receipt"),
		p("Upload a photo of your receipt to get started."),
		form({ onsubmit: handleUpload }, fileInput, button("Upload and Analyze")),
		() => (statusMessage.val ? p(statusMessage.val) : ""),
	);
};

const NotFoundPage = () => div("404 - Page Not Found");

const router = createRouter<() => HTMLElement>();

addRoute(router, undefined, "/", HomePage);
addRoute(router, undefined, "/login", LoginPage);
addRoute(router, undefined, "/dashboard", DashboardPage);
addRoute(router, undefined, "/add", AddPage);
const notFoundPath = "/404";
addRoute(router, undefined, notFoundPath, NotFoundPage);

const App = () => {
	const path = page.val;

	if (authUser.val && path === "/login") {
		jumpPath("/dashboard");
		return div("Already logged in. Redirecting...");
	}

	if (!authUser.val && (path === "/dashboard" || path === "/add")) {
		jumpPath("/login");
		return div("Redirecting to login...");
	}

	const route = findRoute(router, undefined, path);
	if (route) {
		return div(route.data);
	}
	jumpPath(notFoundPath);
	return "";
};

van.add(document.body, Header, App);
