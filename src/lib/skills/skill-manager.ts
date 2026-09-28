import type { SkillsIndex, SkillManifestEntry, StyleRecipeMeta } from "@/types/skills";

const CACHE_NAME = "buddhi-skills-v1";
const SKILLS_BASE_PATH = "/skills";

export class SkillManager {
    private static instance: SkillManager;
    private memoryCache: Map<string, string> = new Map();

    private constructor() {}

    public static getInstance(): SkillManager {
        if (!SkillManager.instance) {
            SkillManager.instance = new SkillManager();
        }
        return SkillManager.instance;
    }

    /**
     * Fetches the Tier 1 skills index manifest.
     * Caches in CacheStorage when available.
     */
    public async fetchIndex(): Promise<SkillsIndex> {
        const url = `${SKILLS_BASE_PATH}/index.json`;
        const content = await this.fetchWithCache(url);
        try {
            return JSON.parse(content) as SkillsIndex;
        } catch (error) {
            console.error("[SkillManager] Failed to parse skills index:", error);
            throw error;
        }
    }

    /**
     * Fetches a specific markdown file from public/skills/.
     * e.g. "web-design-engineer/SKILL.md" or "web-design-engineer/references/style-recipes/linear.md"
     */
    public async fetchFile(relativePath: string): Promise<string> {
        const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
        const url = `${SKILLS_BASE_PATH}/${cleanPath}`;
        return this.fetchWithCache(url);
    }

    /**
     * Retrieves the file content via memory cache -> CacheStorage -> network.
     */
    private async fetchWithCache(url: string): Promise<string> {
        // 1. Memory Cache
        if (this.memoryCache.has(url)) {
            return this.memoryCache.get(url)!;
        }

        // 2. CacheStorage API
        if (typeof window !== "undefined" && "caches" in window) {
            try {
                const cache = await window.caches.open(CACHE_NAME);
                const cachedResponse = await cache.match(url);
                if (cachedResponse && cachedResponse.ok) {
                    const text = await cachedResponse.text();
                    this.memoryCache.set(url, text);
                    return text;
                }
            } catch (err) {
                console.warn("[SkillManager] CacheStorage lookup error:", err);
            }
        }

        // 3. Network Fetch
        try {
            const response = await fetch(url, {
                headers: {
                    "Cache-Control": "public, max-age=3600",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch skill asset from ${url} (status: ${response.status})`);
            }

            const text = await response.text();
            this.memoryCache.set(url, text);

            // Store in CacheStorage
            if (typeof window !== "undefined" && "caches" in window) {
                try {
                    const cache = await window.caches.open(CACHE_NAME);
                    await cache.put(url, new Response(text, {
                        headers: { "Content-Type": response.headers.get("Content-Type") || "text/plain" }
                    }));
                } catch (cacheErr) {
                    console.warn("[SkillManager] CacheStorage put error:", cacheErr);
                }
            }

            return text;
        } catch (fetchErr) {
            console.error(`[SkillManager] Error fetching ${url}:`, fetchErr);
            throw fetchErr;
        }
    }

    /**
     * Matches a prompt against skill triggers.
     */
    public matchSkill(prompt: string, index: SkillsIndex): SkillManifestEntry | null {
        const lower = prompt.toLowerCase();
        for (const skill of index.skills) {
            const matches = skill.triggers.some(trigger => lower.includes(trigger.toLowerCase()));
            if (matches) return skill;
        }
        return null;
    }

    /**
     * Matches a prompt against available style recipes for a skill.
     */
    public matchRecipe(prompt: string, skill: SkillManifestEntry): StyleRecipeMeta | null {
        if (!skill.recipes || skill.recipes.length === 0) return null;
        const lower = prompt.toLowerCase();
        for (const recipe of skill.recipes) {
            if (lower.includes(recipe.id.toLowerCase()) || lower.includes(recipe.name.toLowerCase())) {
                return recipe;
            }
        }
        return null;
    }
}

export const skillManager = SkillManager.getInstance();
