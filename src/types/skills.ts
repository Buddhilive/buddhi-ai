export interface StyleRecipeMeta {
    id: string;
    name: string;
    file: string;
    description?: string;
}

export interface SkillReferenceMeta {
    id: string;
    name: string;
    file: string;
}

export interface SkillManifestEntry {
    id: string;
    name: string;
    version: string;
    description: string;
    category: string;
    entryPoint: string;
    triggers: string[];
    recipes?: StyleRecipeMeta[];
    references?: SkillReferenceMeta[];
}

export interface SkillsIndex {
    version: string;
    updatedAt: string;
    skills: SkillManifestEntry[];
}

export interface CachedSkillItem {
    path: string;
    content: string;
    cachedAt: number;
}
