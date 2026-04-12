interface BuddhiIDBStore {
    name: string;
}

const initializeDB = (
    dbName: string,
    dbVersion: number,
    stores: BuddhiIDBStore[]
): Promise<IDBDatabase> => {
    try {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = () => {
                console.error("IndexedDB error:", request.error);
                reject(`Failed to open IndexedDB: ${request.error}`);
            };

            request.onsuccess = () => {
                const db = request.result;
                // console.log("Buddhi AI IndexedDB opened successfully");
                resolve(db);
            };

            request.onupgradeneeded = () => {
                const db = request.result;

                // Create object stores
                stores.forEach((store) => {
                    if (!db.objectStoreNames.contains(store.name)) {
                        db.createObjectStore(store.name);
                        // console.log(`Object store ${store.name} created`);
                    }
                });
            };
        });
    } catch (error) {
        return Promise.reject(`Failed to initialize IndexedDB: ${error}`);
    }
};

const addItemToStore = async <T>(
    idb: IDBDatabase,
    storeName: string,
    item: T,
    key: string
): Promise<T> => {
    try {
        return new Promise((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.add(item as T, key);

            request.onsuccess = () => {
                resolve(item);
            };

            request.onerror = () => {
                reject(`Error adding item to ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Add operation failed:", error);
        return Promise.reject(`Add operation failed: ${error}`);
    }
};

const getAllFromStore = <T>(
    idb: IDBDatabase,
    storeName: string
): Promise<T[]> => {
    try {
        return new Promise<T[]>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result as T[]);
            };

            request.onerror = () => {
                reject(`Error getting items from ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Get operation failed:", error);
        return Promise.reject(`Get operation failed: ${error}`);
    }
};

const getItemByKey = <T>(
    idb: IDBDatabase,
    storeName: string,
    key: string | number
): Promise<T> => {
    try {
        return new Promise<T>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result as T);
                } else {
                    resolve(undefined as T);
                }
            };

            request.onerror = () => {
                reject(`Error getting item from ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Get by key operation failed:", error);
        return Promise.reject(`Get by key operation failed: ${error}`);
    }
};

const updateItemInStore = <T>(
    idb: IDBDatabase,
    storeName: string,
    item: T,
    key: string
): Promise<T> => {
    try {
        return new Promise<T>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.put(item as T, key);

            request.onsuccess = () => {
                resolve(item);
            };

            request.onerror = () => {
                reject(`Error updating item in ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Update operation failed:", error);
        return Promise.reject(`Update operation failed: ${error}`);
    }
};

const deleteItemFromStore = (
    idb: IDBDatabase,
    storeName: string,
    key: string | number
): Promise<boolean> => {
    try {
        return new Promise<boolean>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(`Error deleting item from ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Delete operation failed:", error);
        return Promise.reject(`Delete operation failed: ${error}`);
    }
};

const clearStore = (idb: IDBDatabase, storeName: string): Promise<boolean> => {
    try {
        return new Promise<boolean>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(`Error clearing ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Clear operation failed:", error);
        return Promise.reject(`Clear operation failed: ${error}`);
    }
};

const queryStoreByIndex = <T>(
    idb: IDBDatabase,
    storeName: string,
    indexName: string,
    query: string | number
): Promise<T[]> => {
    try {
        return new Promise<T[]>((resolve, reject) => {
            const transaction = idb.transaction(storeName, "readonly");
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(query);

            request.onsuccess = () => {
                resolve(request.result as T[]);
            };

            request.onerror = () => {
                reject(`Error querying ${indexName} in ${storeName}: ${request.error}`);
            };
        });
    } catch (error) {
        console.error("Query by index operation failed:", error);
        return Promise.reject(`Query by index operation failed: ${error}`);
    }
};

const closeDatabase = (idb: IDBDatabase): void => {
    if (idb) {
        idb.close();
        // console.log("IndexedDB connection closed");
    }
};

export {
    initializeDB,
    addItemToStore,
    getAllFromStore,
    getItemByKey,
    updateItemInStore,
    deleteItemFromStore,
    clearStore,
    queryStoreByIndex,
    closeDatabase,
};
export type { BuddhiIDBStore };