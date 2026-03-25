import { transformersJS } from "@browser-ai/transformers-js";
import { embed } from "ai";
import { MODELS } from "./models";

let embeddingModel: any = null;

async function getModel() {
    if (!embeddingModel) {
        const config = MODELS[1]; // onnx-community/embeddinggemma-300m-ONNX
        embeddingModel = transformersJS.embedding(config.id, {
            device: config.device,
            dtype: config.dtype,
        });
    }
    return embeddingModel;
}

self.onmessage = async (evt: MessageEvent) => {
    const { type, id, text } = evt.data;
    if (type !== "embed") return;

    try {
        const model = await getModel();
        const { embedding } = await embed({ model, value: text });
        self.postMessage({ type: "result", id, embedding });
    } catch (err) {
        self.postMessage({ type: "error", id, message: (err as Error).message });
    }
};
