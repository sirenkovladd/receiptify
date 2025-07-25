import van from "vanjs-core";
import type { Receipt } from "./main";
import { NavLink, selectedReceipt } from "./utils"; // import shared value

const { div, h1, p, h3, input, select, option, button, table, thead, tbody, tr, th, td } = van.tags;

const ReceiptsTable = (receipts: Receipt[]) => {
	const handleReceiptClick = (receipt: Receipt) => {
		selectedReceipt.val = receipt;
	};

	return table(
		{ class: "md3-table" },
		thead(
			tr(
				th("Store"),
				th("Date"),
				th("Type"),
				th("Total"),
				th("Actions")
			)
		),
		tbody(
			...receipts.map((receipt) =>
				tr(
					td(receipt.storeName || "N/A"),
					td(new Date(receipt.datetime).toLocaleDateString()),
					td(
						div(
							{ class: "md3-chip" },
							receipt.type.charAt(0).toUpperCase() + receipt.type.slice(1)
						)
					),
					td(`${parseFloat(receipt.totalAmount).toFixed(2)}`),
					td(
						NavLink(
							{
								path: `/edit/${receipt.id}`,
								class: "md3-button md3-button-text",
								onclick: () => handleReceiptClick(receipt),
							},
							"Edit"
						)
					)
				)
			)
		)
	);
};


const DashboardPage = () => {
	const receipts = van.state<Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);
	const searchTerm = van.state("");
	const sortBy = van.state("datetime"); // 'datetime', 'totalAmount', 'storeName'
	const sortOrder = van.state("desc"); // 'asc', 'desc'
	
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
				(!filterDateFrom.val || new Date(r.datetime) >= new Date(filterDateFrom.val)) &&
				(!filterDateTo.val || new Date(r.datetime) <= new Date(filterDateTo.val)) &&
				(!filterMinAmount.val || parseFloat(r.totalAmount) >= parseFloat(filterMinAmount.val)) &&
				(!filterMaxAmount.val || parseFloat(r.totalAmount) <= parseFloat(filterMaxAmount.val)) &&
				(!filterType.val || r.type === filterType.val) &&
				(!filterStore.val || r.storeName?.toLowerCase().includes(filterStore.val.toLowerCase()))
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
			h1({ class: "md3-top-app-bar-title" }, "Dashboard")
		),
		// Stats cards
		div(
			{ class: "md3-grid md3-grid-cols-1 md3-grid-cols-3@md" },
			div(
				{ class: "md3-stat-card" },
				div(
					{ class: "md3-stat-icon" },
					div({ innerHTML: "📋" })
				),
				div(
					{ class: "md3-stat-content" },
					h3(() => filteredAndSortedReceipts.val.length.toString()),
					p("Total Transactions")
				)
			),
			div(
				{ class: "md3-stat-card" },
				div(
					{ class: "md3-stat-icon" },
					div({ innerHTML: "💰" })
				),
				div(
					{ class: "md3-stat-content" },
					h3(() => `${totalAmount.val.toFixed(2)}`),
					p("Total Amount")
				)
			),
			div(
				{ class: "md3-stat-card" },
				div(
					{ class: "md3-stat-icon" },
					div({ innerHTML: "🏪" })
				),
				div(
					{ class: "md3-stat-content" },
					h3(() => {
						const stores = new Set(filteredAndSortedReceipts.val.map(r => r.storeName));
						return stores.size.toString();
					}),
					p("Unique Stores")
				)
			)
		),
		// Filters section
		div(
			{ class: "md3-card" },
			div(
				{ style: "display: flex; align-items: center; margin-bottom: 16px;" },
				div(
					{ innerHTML: "🔍", style: "margin-right: 8px;" }
				),
				h3({ style: "margin: 0; font-weight: 500;" }, "Filters")
			),
			div(
				{ class: "md3-grid md3-grid-cols-2 md3-grid-cols-4@md" },
				input({
					class: "md3-text-field",
					type: "text",
					placeholder: "Search by store or amount...",
					value: searchTerm,
					oninput: (e) => { searchTerm.val = e.target.value; }
				}),
				input({
					class: "md3-text-field",
					type: "text",
					placeholder: "Store name",
					value: filterStore,
					oninput: (e) => { filterStore.val = e.target.value; }
				}),
				select(
					{
						class: "md3-select",
						value: filterType,
						onchange: (e) => { filterType.val = e.target.value; }
					},
					option({ value: "" }, "All Types"),
					option({ value: "grocery" }, "Grocery"),
					option({ value: "restaurant" }, "Restaurant"),
					option({ value: "gas" }, "Gas"),
					option({ value: "retail" }, "Retail"),
					option({ value: "other" }, "Other")
				),
				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date from",
					value: filterDateFrom,
					oninput: (e) => { filterDateFrom.val = e.target.value; }
				}),
				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date to",
					value: filterDateTo,
					oninput: (e) => { filterDateTo.val = e.target.value; }
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Min amount",
					value: filterMinAmount,
					oninput: (e) => { filterMinAmount.val = e.target.value; }
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Max amount",
					value: filterMaxAmount,
					oninput: (e) => { filterMaxAmount.val = e.target.value; }
				}),
				select(
					{
						class: "md3-select",
						value: sortBy,
						onchange: (e) => { sortBy.val = e.target.value; }
					},
					option({ value: "datetime" }, "Sort by Date"),
					option({ value: "totalAmount" }, "Sort by Amount"),
					option({ value: "storeName" }, "Sort by Store")
				),
				select(
					{
						class: "md3-select",
						value: sortOrder,
						onchange: (e) => { sortOrder.val = e.target.value; }
					},
					option({ value: "desc" }, "Descending"),
					option({ value: "asc" }, "Ascending")
				)
			),
			div(
				{ style: "margin-top: 16px; display: flex; justify-content: flex-end;" },
				button(
					{
						class: "md3-button md3-button-text",
						onclick: clearFilters
					},
					"Clear Filters"
				)
			)
		),
		// Results section
		div(
			{ class: "md3-card md3-card-elevated", style: "padding: 0; overflow-x: auto;" },
			() => {
				if (loading.val) return p({style: "padding: 16px;"}, "Loading receipts...");
				if (error.val) return p({ class: "error", style: "padding: 16px;" }, `Error: ${error.val}`);
				if (filteredAndSortedReceipts.val.length === 0)
					return p({style: "padding: 16px;"}, "No receipts found. Add one!");

				return ReceiptsTable(filteredAndSortedReceipts.val);
			}
		),
		// Floating Action Button
		button(
			{
				class: "md3-fab",
				onclick: () => {
					window.location.hash = "#/add";
				}
			},
			div({ innerHTML: "➕" })
		)
	);
};

export default DashboardPage;