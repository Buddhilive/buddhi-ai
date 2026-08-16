export type DocPhase = "reading" | "parsing" | "enriching" | "indexing" | "saving" | null;
export type DocProcessingStatus = "pending" | "processing" | "completed" | "failed";

export interface DocProcessingState {
    status: DocProcessingStatus;
    phase: DocPhase;
    overallPct: number; // 0–100
    errorMsg: string | null;
}

export interface DocumentStore {
    docs: Record<number, DocProcessingState>;
    activeCount: number;
    initDoc(id: number): void;
    updateProgress(id: number, phase: DocPhase, overallPct: number): void;
    completeDoc(id: number): void;
    failDoc(id: number, errorMsg: string): void;
    removeDoc(id: number): void;
}

export interface DocumentInfo {
    id: number;
    original_name: string;
    file_size: number;
    status: "pending" | "processing" | "completed" | "failed";
    /** OKF root concept id — used to look up/remove the root concept in the OKF store. */
    concept_id: string | null;
    /**
     * All OKF concept ids produced for this document (root + any decomposed
     * sub-concepts). Falls back to `[concept_id]` when absent (older records
     * written before decomposition existed).
     */
    concept_ids: string[] | null;
    error_msg: string | null;
    created_at: string;
}

export interface DocStoreRecord extends DocumentInfo {
    file_data: ArrayBuffer;
}
