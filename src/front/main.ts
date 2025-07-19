import { addRoute, createRouter, findRoute } from "rou3";
import van, { type State } from "vanjs-core";
import type { ParsedReceipt } from "../back/analyzer";
import "./main.css";
import type { ReceiptUpload, ReceiptUploadItem } from "../back/db";

const {
	div,
	h1,
	p,
	button,
	input,
	form,
	label,
	nav,
	a,
	h3,
	span,
	textarea,
	select,
	option,
	datalist,
} = van.tags;

// Initialize authUser from localStorage

interface Receipt {
	id: number;
	userId: number;
	type: string;
	storeName: string | null;
	datetime: string;
	imageUrl: string | null;
	totalAmount: number;
	description: string | null;
	createdAt: string;
	updatedAt: string;
}

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
		() => (authUser.val ? "" : NavLink("/login", "Login")),
		() => (authUser.val ? NavLink("/dashboard", "Dashboard") : ""),
		() => (authUser.val ? NavLink("/add", "Add Receipt") : ""),
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
				: "",
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
				input({
					type: "email",
					oninput: (e) => (email.val = (e.target as HTMLInputElement).value),
				}),
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

const DashboardPage = () => {
	const receipts = van.state<Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);

	const fetchReceipts = async () => {
		try {
			loading.val = true;
			error.val = null;
			const response = await fetch("/api/receipts");
			if (!response.ok) {
				throw new Error("Failed to fetch receipts");
			}
			receipts.val = await response.json();
		} catch (err: any) {
			error.val = err.message || "An unknown error occurred.";
		} finally {
			loading.val = false;
		}
	};

	fetchReceipts();

	return div(h1("Dashboard"), p("Here are your saved transactions."), () => {
		if (loading.val) return p("Loading receipts...");
		if (error.val) return p({ class: "error" }, `Error: ${error.val}`);
		if (receipts.val.length === 0) return p("No receipts found. Add one!");

		return div(
			{ class: "receipts-list" },
			receipts.val.map((receipt) =>
				div(
					{ class: "receipt-item" },
					h3(receipt.storeName || "Unnamed Store"),
					p(`Total: $${receipt.totalAmount.toFixed(2)}`),
					p(`Date: ${new Date(receipt.datetime).toLocaleString()}`),
				),
			),
		);
	});
};

type ReactItem = {
	name: State<string>;
	count: State<number>;
	price: State<number>;
};

const GroceryItems = (items: State<ReactItem[]>) => {
	return div(
		h3("Items"),
		() =>
			div(
				items.val.map((item) =>
					div(
						{ class: "item" },
						input({
							type: "text",
							value: item.name,
							oninput: (e) => {
								item.name.val = e.target.value;
							},
							placeholder: "Item Name",
						}),
						input({
							type: "number",
							value: item.count,
							oninput: (e) => {
								item.count.val = Number(e.target.value);
							},
							min: 1,
						}),
						input({
							type: "number",
							value: item.price,
							oninput: (e: Event) => {
								// Ensure the event target is an HTMLInputElement before accessing its value
								const target = e.target as HTMLInputElement;
								if (!target) return; // If target is unexpectedly null, exit
								// Attempt to convert the input value to a number and update the state
								// If conversion fails (e.g., the input is not a number), don't update the state to avoid errors
								item.price.val = Number(e.target.value);
							},
							step: "0.01",
							min: 0,
						}),
						button(
							{
								onclick: () => {
									items.val = items.val.filter((i) => i !== item);
								},
							},
							"Remove",
						),
					),
				),
			),
		() => {
			const total = items.val.reduce(
				(sum, item) => sum + item.count.val * item.price.val,
				0,
			);
			return div(
				{ class: "items-total" },
				`Total: $${total.toFixed(2)}`,
			);
		},
		button(
			{
				onclick: () => {
					items.val = [
						...items.val,
						{
							name: van.state(""),
							count: van.state(1),
							price: van.state(0),
						},
					];
				},
			},
			"Add Item",
		),
	);
};

const AddPage = () => {
	const fileInput = input({ type: "file", accept: "image/*" });
	const statusMessage = van.state("");
	const storeName = van.state("");
	const datetime = van.state(new Date().toISOString());
	const type = van.state("grocery");
	const items = van.state<ReactItem[]>([]);
	const storeNamesList = van.state<string[]>([]);
	const imageUrl = van.state<string | null>(null);
	const totalAmount = van.state(0);
	const description = van.state("");

	const fetchStoreNames = async () => {
		try {
			const response = await fetch("/api/stores");
			if (response.ok) {
				storeNamesList.val = await response.json();
			}
		} catch (error) {
			console.error("Failed to fetch store names:", error);
		}
	};
	fetchStoreNames();

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
			const receipt: ParsedReceipt & {
				totalAmount?: number;
				imageUrl?: string;
			} = await response.json();
			if (receipt.storeName) {
				storeName.val = receipt.storeName;
			}
			datetime.val = receipt.datetime;
			type.val = receipt.type;
			items.val = receipt.items.map((item) => ({
				name: van.state(item.name),
				count: van.state(item.count),
				price: van.state(item.price),
			}));
			totalAmount.val =
				receipt.totalAmount ||
				items.val.reduce(
					(sum, item) => sum + item.count.val * item.price.val,
					0,
				);
			imageUrl.val = receipt.imageUrl || null;
			statusMessage.val = "Analysis complete. Please review and save.";
		} catch (error: any) {
			statusMessage.val = `Error: ${error.message || "Analysis failed."}`;
		}
	};

	const handleSave = async () => {
		statusMessage.val = "Saving...";
		try {
			const isGrocery = type.val === "grocery";
			const finalTotalAmount = isGrocery
				? items.val.reduce(
						(sum, item) => sum + item.count.val * item.price.val,
						0,
					)
				: totalAmount.val;

			const receiptData: ReceiptUpload = {
				storeName: storeName.val,
				datetime: new Date(datetime.val),
				type: type.val,
				totalAmount: finalTotalAmount,
				description: description.val,
				items: isGrocery
					? items.val.map((i) => ({
							name: i.name.val,
							quantity: i.count.val,
							unitPrice: i.price.val,
						}))
					: [],
				imageUrl: imageUrl.val,
				tags: []
			};

			const response = await fetch("/api/receipts", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(receiptData),
			});

			if (!response.ok) {
				const errData = await response.json();
				throw new Error(errData.message || "Failed to save receipt");
			}

			jumpPath("/dashboard");
		} catch (err: any) {
			statusMessage.val = `Error: ${err.message}`;
		}
	};

	const OtherReceiptDetails = () =>
		div(
			div(
				label("Total Amount:"),
				input({
					type: "number",
					step: "0.01",
					min: 0,
					value: totalAmount,
					oninput: (e) =>
						(totalAmount.val = Number((e.target as HTMLInputElement).value)),
				}),
			),
			div(
				label("Description:"),
				textarea({
					value: description,
					oninput: (e) =>
						(description.val = (e.target as HTMLTextAreaElement).value),
					placeholder: "e.g., Dinner with colleagues",
				}),
			),
		);

	return div(
		h1("Add New Receipt"),
		p("Upload a photo of your receipt to get started."),
		form({ onsubmit: handleUpload }, fileInput, button("Upload and Analyze")),
		() => (statusMessage.val ? p(statusMessage.val) : ""),
		div(
			h3("Receipt Details"),
			div(
				label({ for: "store-name-input" }, "Store Name:"),
				input({
					id: "store-name-input",
					type: "text",
					value: storeName,
					oninput: (e) => {
						storeName.val = (e.target as HTMLInputElement).value;
					},
					list: "store-names-datalist",
				}),
				() =>
					datalist(
						{ id: "store-names-datalist" },
						storeNamesList.val.map((name) => option({ value: name })),
					),
			),
			div(
				label("Date & Time:"),
				input({
					type: "datetime-local",
					value: () => {
						const date = new Date(datetime.val);
						return date.toISOString().slice(0, 19); // Format for datetime-local
					},
					oninput: (e) => {
						const inputDate = new Date((e.target as HTMLInputElement).value);
						// Convert to UTC and format for database
						datetime.val = inputDate.toISOString();
					},
				}),
			),
			div(
				label("Type:"),
				select(
					{
						value: type,
						onchange: (e) => {
							type.val = (e.target as HTMLSelectElement).value;
						},
					},
					option({ value: "grocery" }, "Grocery"),
					option({ value: "restaurant" }, "Restaurant"),
					option({ value: "gas" }, "Gas"),
					option({ value: "retail" }, "Retail"),
					option({ value: "other" }, "Other"),
				),
			),
			() => (type.val === "grocery" ? GroceryItems(items) : OtherReceiptDetails()),
			button({ onclick: handleSave }, "Save Receipt"),
		),
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
