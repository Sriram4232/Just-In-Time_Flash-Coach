export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const API_ROUTES = {
    HEALTH: `${API_BASE_URL}/health`,
    COACHING_ADVICE: `${API_BASE_URL}/coaching/advice`,
    LANGUAGES: `${API_BASE_URL}/api/languages`,
    HISTORY: (teacherId: string) => `${API_BASE_URL}/history/${teacherId}`,
    FEEDBACK: `${API_BASE_URL}/feedback`,
    SPEECH_TO_TEXT: `${API_BASE_URL}/api/speech-to-text`,
    TEXT_TO_SPEECH: `${API_BASE_URL}/api/text-to-speech`,
} as const;

/**
 * Checks if the backend is available.
 * Returns true if healthy, false otherwise.
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

        const res = await fetch(API_ROUTES.HEALTH, {
            method: "GET",
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) return false;

        const data = await res.json();
        return data.status === "ok";
    } catch (error) {
        console.error("Health check failed:", error);
        return false;
    }
}
