export const LANGUAGE_CODES: { code: string; name: string }[] = [
    { code: "ar", name: "Arabic" },
    { code: "bn", name: "Bengali" },
    { code: "zh", name: "Chinese" },
    { code: "nl", name: "Dutch" },
    { code: "en", name: "English" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "id", name: "Indonesian" },
    { code: "it", name: "Italian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "es", name: "Spanish" },
    { code: "sv", name: "Swedish" },
    { code: "ta", name: "Tamil" },
    { code: "th", name: "Thai" },
    { code: "tr", name: "Turkish" },
    { code: "uk", name: "Ukrainian" },
    { code: "vi", name: "Vietnamese" },
];

// Backwards-compatible map for existing code that expects an object keyed by code
export const LANGUAGE_CODE_MAP: { [key: string]: string } = LANGUAGE_CODES.reduce((acc, cur) => {
    acc[cur.code] = cur.name;
    return acc;
}, {} as { [key: string]: string });