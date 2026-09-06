import { Engine } from '@litert-lm/core';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface LiteRTModelState {
    liteRTModelInstance?: Engine;
    liteRTModelModel?: string;
    liteRTModelStatus?: "idle" | "loading" | "ready" | "error";
    setLiteRTModelInstance: (instance?: Engine) => void;
    setLiteRTModelModel: (model?: string) => void;
    setLiteRTModelStatus: (status?: "idle" | "loading" | "ready" | "error") => void;
}

export const useLiteRTModelStore = create<LiteRTModelState>()(
    devtools((set) => ({
        liteRTModelInstance: undefined,
        liteRTModelModel: undefined,
        liteRTModelStatus: "idle",
        setLiteRTModelModel: (model) => set({ liteRTModelModel: model }),
        setLiteRTModelInstance: (instance) => set({ liteRTModelInstance: instance }),
        setLiteRTModelStatus: (status) => set({ liteRTModelStatus: status }),
    }))
);