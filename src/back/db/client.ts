import { AsyncLocalStorage } from "node:async_hooks";
import { SQL } from "bun";

export class DB {
	db: SQL;
	storage: AsyncLocalStorage<SQL>;
	constructor(_config: unknown) {
		this.db = new SQL();
		this.storage = new AsyncLocalStorage<SQL>();
	}

	sql() {
		const currentClient = this.storage.getStore();
		return currentClient || this.db;
	}

	transaction<T>(callback: () => Promise<T>): Promise<T> {
		return this.db.begin(async (tx) => {
			return this.storage.run(tx, callback);
		});
	}
}
