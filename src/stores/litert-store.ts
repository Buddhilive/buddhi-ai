import { LlmInference } from '@mediapipe/tasks-genai';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface LiteRTModelState {
    liteRTModelInstance?: LlmInference;
    liteRTModelModel?: string;
    liteRTModelStatus?: "idle" | "loading" | "ready" | "error";
    setLiteRTModelInstance: (instance?: LlmInference) => void;
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