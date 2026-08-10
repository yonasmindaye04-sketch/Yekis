
// === INTERFACES & TYPES ===
export interface TelegramAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    ucid: string;
    role: string;
  };
  telegram: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";


// === MAIN FUNCTIONS ===
export async function loginWithTelegram(initData: string): Promise<TelegramAuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  if (!response.ok) {
    throw new Error("Telegram login failed.");
  }

  return response.json();
}
