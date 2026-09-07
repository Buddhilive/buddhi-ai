import { create } from "zustand";

export interface CanvasAsset {
    id: string;
    name: string;
    size: number;
    type: string;
    url: string;
    addedAt: number;
}

interface AssetStoreState {
    assets: CanvasAsset[];
    addAsset: (file: File) => CanvasAsset;
    removeAsset: (id: string) => void;
    clearAssets: () => void;
}

export const useAssetStore = create<AssetStoreState>((set) => ({
    assets: [],

    addAsset: (file: File) => {
        const id = `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const url = URL.createObjectURL(file);
        const asset: CanvasAsset = {
            id,
            name: file.name,
            size: file.size,
            type: file.type,
            url,
            addedAt: Date.now(),
        };

        set((state) => ({
            assets: [asset, ...state.assets],
        }));

        return asset;
    },

    removeAsset: (id: string) => {
        set((state) => {
            const item = state.assets.find((a) => a.id === id);
            if (item) {
                URL.revokeObjectURL(item.url);
            }
            return {
                assets: state.assets.filter((a) => a.id !== id),
            };
        });
    },

    clearAssets: () => {
        set((state) => {
            state.assets.forEach((a) => URL.revokeObjectURL(a.url));
            return { assets: [] };
        });
    },
}));
