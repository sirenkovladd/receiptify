import van, { type State } from "vanjs-core";
import type { Receipt } from "./main";
import {
	fetchStoreNames,
	NavLink,
	selectedReceipt,
	storeNamesList,
} from "./utils"; // import shared value

const {
	div,
	h1,
	p,
	h3,
	input,
	select,
	option,
	button,
	table,
	thead,
	tbody,
	tr,
	th,
	td,
	span,
	datalist,
} = van.tags;

const Chip = (text: string, type: string = "") => {
	let chipClass = "md3-chip";
	if (type === "folder") {
		chipClass += " md3-chip-folder"; // Custom class for folder chips
	} else if (type === "tag") {
		chipClass += " md3-chip-tag"; // Custom class for tag chips
	} else if (type === "category") {
		chipClass += " md3-chip-category"; // Custom class for category chips
	}
	return div({ class: chipClass }, text);
};

const ReceiptsTable = (receipts: Receipt[]) => {
	const handleReceiptClick = (receipt: Receipt) => {
		selectedReceipt.val = receipt;
	};

	return table(
		{ class: "md3-data-table" }, // Using md3-data-table for better styling
		thead(
			tr(
				th({ class: "" }, "Date"),
				th({ class: "" }, "Place"),
				th({ class: "" }, "Amount"),
				th({ class: "" }, "Card"),
				th({ class: "" }, "Folder"),
				th({ class: "" }, "Tags"),
				th({ class: "" }, "Category"),
				th({ class: "" }, "Actions"),
			),
		),
		tbody(
			...receipts.map((receipt) =>
				tr(
					td(
						new Date(receipt.datetime).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						}),
					), // Formatted date
					td(
						div(
							{ class: "flex items-center" }, // Flex container for place and receipt chip
							span({ class: "mr-2" }, receipt.storeName || "N/A"),
							receipt.type === "retail"
								? Chip("Receipt", "receipt-label")
								: null, // Example for a "Receipt" chip
						),
					),
					td(`$${parseFloat(receipt.totalAmount).toFixed(2)}`),
					td(receipt.card || "N/A"),
					td(Chip(receipt.folder || "N/A", "folder")), // Folder chip
					td(
						div(
							{ class: "flex flex-wrap gap-1" }, // Flex container for multiple tags
							...(receipt.tags || []).map((tag) => Chip(tag, "tag")), // Tags as chips
						),
					),
					td(Chip(receipt.category || "N/A", "category")), // Category chip
					td(
						div(
							{ class: "flex gap-2" },
							NavLink(
								{
									path: `/edit/${receipt.id}`,
									class: "md3-icon-button", // Use icon button style
									onclick: () => handleReceiptClick(receipt),
								},
								span({ innerHTML: "✏️" }), // Edit icon
							),
							button(
								{
									class: "md3-icon-button", // Use icon button style
									onclick: () => {
										// Implement delete logic here
										console.log("Delete receipt:", receipt.id);
									},
								},
								span({ innerHTML: "🗑️" }), // Delete icon
							),
						),
					),
				),
			),
		),
	);
};

const TransactionTaab = ({
	loading,
	error,
	searchTerm,
	sortBy,
	sortOrder,
	filteredAndSortedReceipts,
	filterDateFrom,
	filterDateTo,
	filterMinAmount,
	filterMaxAmount,
	filterType,
	filterStore,
	clearFilters,
}: {
	loading: State<boolean>;
	error: State<string | null>;
	searchTerm: State<string>;
	sortBy: State<string>;
	sortOrder: State<string>;
	filteredAndSortedReceipts: State<Receipt[]>;
	filterDateFrom: State<string>;
	filterDateTo: State<string>;
	filterMinAmount: State<string>;
	filterMaxAmount: State<string>;
	filterType: State<string>;
	filterStore: State<string>;
	clearFilters: () => void;
}) => {
	return div(
		// Filters section
		div(
			{ class: "md3-card" },
			div(
				{ style: "display: flex; align-items: center; margin-bottom: 16px;" },
				div({ innerHTML: "🔍", style: "margin-right: 8px;" }),
				h3({ style: "margin: 0; font-weight: 500;" }, "Filters"),
			),
			div(
				{ class: "md3-grid md3-grid-cols-2 md3-grid-cols-4@md" },
				input({
					class: "md3-text-field",
					type: "text",
					placeholder: "Search by store or amount...",
					value: searchTerm,
					oninput: (e) => {
						searchTerm.val = e.target.value;
					},
				}),
				input({
					id: "store-name-input",
					class: "md3-text-field",
					type: "text",
					placeholder: "Store name",
					value: filterStore,
					list: "store-names-datalist",
					oninput: (e) => {
						filterStore.val = e.target.value;
					},
				}),
				() =>
					datalist(
						{ id: "store-names-datalist" },
						storeNamesList.val.map((name) => option({ value: name })),
					),
				select(
					{
						class: "md3-select",
						value: filterType,
						onchange: (e) => {
							filterType.val = e.target.value;
						},
					},
					option({ value: "" }, "All Types"),
					option({ value: "grocery" }, "Grocery"),
					option({ value: "restaurant" }, "Restaurant"),
					option({ value: "gas" }, "Gas"),
					option({ value: "retail" }, "Retail"),
					option({ value: "other" }, "Other"),
				),
				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date from",
					value: filterDateFrom,
					oninput: (e) => {
						filterDateFrom.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date to",
					value: filterDateTo,
					oninput: (e) => {
						filterDateTo.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Min amount",
					value: filterMinAmount,
					oninput: (e) => {
						filterMinAmount.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Max amount",
					value: filterMaxAmount,
					oninput: (e) => {
						filterMaxAmount.val = e.target.value;
					},
				}),
				select(
					{
						class: "md3-select",
						value: sortBy,
						onchange: (e) => {
							sortBy.val = e.target.value;
						},
					},
					option({ value: "datetime" }, "Sort by Date"),
					option({ value: "totalAmount" }, "Sort by Amount"),
					option({ value: "storeName" }, "Sort by Store"),
				),
				select(
					{
						class: "md3-select",
						value: sortOrder,
						onchange: (e) => {
							sortOrder.val = e.target.value;
						},
					},
					option({ value: "desc" }, "Descending"),
					option({ value: "asc" }, "Ascending"),
				),
			),
			div(
				{
					style: "margin-top: 16px; display: flex; justify-content: flex-end;",
				},
				button(
					{
						class: "md3-button md3-button-text",
						onclick: clearFilters,
					},
					"Clear Filters",
				),
			),
		),
		// Results section
		div(
			{
				class: "md3-card md3-card-elevated",
				style: "padding: 0; overflow-x: auto; margin-top: 16px;",
			},
			() => {
				if (loading.val)
					return p({ style: "padding: 16px;" }, "Loading receipts...");
				if (error.val)
					return p(
						{ class: "error", style: "padding: 16px;" },
						`Error: ${error.val}`,
					);
				if (filteredAndSortedReceipts.val.length === 0)
					return p({ style: "padding: 16px;" }, "No receipts found. Add one!");

				return ReceiptsTable(filteredAndSortedReceipts.val);
			},
		),
		// Floating Action Button
		button(
			{
				class: "md3-fab",
				onclick: () => {
					window.location.hash = "#/add";
				},
			},
			div({ innerHTML: "➕" }),
		),
	);
};

const DashboardPage = () => {
	const receipts = van.state<Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);
	const searchTerm = van.state("");
	const sortBy = van.state("datetime"); // 'datetime', 'totalAmount', 'storeName'
	const sortOrder = van.state("desc"); // 'asc', 'desc'
	const activeTab = van.state("transactions"); // 'transactions', 'products', 'analytics'

	fetchStoreNames();

	// Filter states
	const filterDateFrom = van.state("");
	const filterDateTo = van.state("");
	const filterMinAmount = van.state("");
	const filterMaxAmount = van.state("");
	const filterType = van.state("");
	const filterStore = van.state("");

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

	const filteredAndSortedReceipts = van.derive(() => {
		const term = searchTerm.val.toLowerCase();
		let filtered = receipts.val.filter(
			(r) =>
				(r.storeName?.toLowerCase().includes(term) ||
					r.totalAmount.toString().includes(term)) &&
				(!filterDateFrom.val ||
					new Date(r.datetime) >= new Date(filterDateFrom.val)) &&
				(!filterDateTo.val ||
					new Date(r.datetime) <= new Date(filterDateTo.val)) &&
				(!filterMinAmount.val ||
					parseFloat(r.totalAmount) >= parseFloat(filterMinAmount.val)) &&
				(!filterMaxAmount.val ||
					parseFloat(r.totalAmount) <= parseFloat(filterMaxAmount.val)) &&
				(!filterType.val || r.type === filterType.val) &&
				(!filterStore.val ||
					r.storeName?.toLowerCase().includes(filterStore.val.toLowerCase())),
		);

		return filtered.sort((a, b) => {
			const aVal = a[sortBy.val as keyof Receipt];
			const bVal = b[sortBy.val as keyof Receipt];

			let comparison = 0;
			if (aVal > bVal) {
				comparison = 1;
			} else if (aVal < bVal) {
				comparison = -1;
			}
			return sortOrder.val === "desc" ? -comparison : comparison;
		});
	});

	const clearFilters = () => {
		searchTerm.val = "";
		filterDateFrom.val = "";
		filterDateTo.val = "";
		filterMinAmount.val = "";
		filterMaxAmount.val = "";
		filterType.val = "";
		filterStore.val = "";
		sortBy.val = "datetime";
		sortOrder.val = "desc";
	};

	const totalAmount = van.derive(() => {
		return filteredAndSortedReceipts.val.reduce((sum, receipt) => {
			return sum + parseFloat(receipt.totalAmount);
		}, 0);
	});

	return div(
		{ class: "md3-container" },
		div(
			{ class: "md3-top-app-bar" },
			h1({ class: "md3-top-app-bar-title" }, "Dashboard"),
		),
		// Stats cards
		div(
			{ class: "md3-grid md3-grid-cols-1 md3-grid-cols-3@md mb16" },
			div(
				{ class: "md3-stat-card" },
				div({ class: "md3-stat-icon" }, div({ innerHTML: "📋" })),
				div(
					{ class: "md3-stat-content" },
					h3(() => filteredAndSortedReceipts.val.length.toString()),
					p("Total Transactions"),
				),
			),
			div(
				{ class: "md3-stat-card" },
				div({ class: "md3-stat-icon" }, div({ innerHTML: "💰" })),
				div(
					{ class: "md3-stat-content" },
					h3(() => `${totalAmount.val.toFixed(2)}`),
					p("Total Amount"),
				),
			),
			div(
				{ class: "md3-stat-card" },
				div({ class: "md3-stat-icon" }, div({ innerHTML: "🏪" })),
				div(
					{ class: "md3-stat-content" },
					h3(() => {
						const stores = new Set(
							filteredAndSortedReceipts.val.map((r) => r.storeName),
						);
						return stores.size.toString();
					}),
					p("Unique Stores"),
				),
			),
		),
		// Tabs
		div(
			{ class: "md3-card" },
			button(
				{
					class: () =>
						`md3-tab ${activeTab.val === "transactions" ? "md3-tab-active" : ""}`,
					onclick: () => {
						activeTab.val = "transactions";
					},
				},
				"Transactions",
			),
			button(
				{
					class: () =>
						`md3-tab ${activeTab.val === "products" ? "md3-tab-active" : ""}`,
					onclick: () => {
						activeTab.val = "products";
					},
				},
				"Products",
			),
			button(
				{
					class: () =>
						`md3-tab ${activeTab.val === "analytics" ? "md3-tab-active" : ""}`,
					onclick: () => {
						activeTab.val = "analytics";
					},
				},
				"Analytics",
			),
		),
		() =>
			activeTab.val === "transactions"
				? TransactionTaab({
						loading,
						error,
						searchTerm,
						sortBy,
						sortOrder,
						filteredAndSortedReceipts,
						filterDateFrom,
						filterDateTo,
						filterMinAmount,
						filterMaxAmount,
						filterType,
						filterStore,
						clearFilters,
					})
				: "",
	);
};

export default DashboardPage;
