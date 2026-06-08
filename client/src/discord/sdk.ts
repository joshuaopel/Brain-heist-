import { DiscordSDK } from "@discord/embedded-app-sdk";

let sdk: DiscordSDK | null = null;
let auth: { access_token: string; user: { id: string; username: string; avatar: string | null } } | null = null;

export function getSDK(): DiscordSDK | null {
  return sdk;
}

export function getAuth() {
  return auth;
}

export async function initDiscord(): Promise<{
  userId: string;
  username: string;
  avatarUrl: string;
}> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const isInsideDiscord = new URLSearchParams(window.location.search).has("frame_id");

  // Return mock user when not inside Discord's Activity iframe
  if (!clientId || !isInsideDiscord) {
    const mockId = `dev_${Math.random().toString(36).slice(2, 8)}`;
    return {
      userId: mockId,
      username: `Player_${mockId.slice(-4)}`,
      avatarUrl: "",
    };
  }

  sdk = new DiscordSDK(clientId);
  await sdk.ready();

  const { code } = await sdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds"],
  });

  const res = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authResult = await sdk.commands.authenticate({ access_token: data.access_token }) as any;
  const user = authResult.user as { id: string; username: string; avatar?: string | null };
  auth = { access_token: authResult.access_token, user: { id: user.id, username: user.username, avatar: user.avatar ?? null } };

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : "";

  return { userId: user.id, username: user.username, avatarUrl };
}
