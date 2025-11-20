const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;
const VITE_BACKEND_WS = import.meta.env.VITE_BACKEND_WS as string | undefined;

const IS_PROD = import.meta.env.PROD;

let backendUrlBase: string;
let websocketUrlBase: string;

if (IS_PROD || (!VITE_BACKEND_URL && !VITE_BACKEND_WS)) {
  // V produkci nebo pokud nejsou proměnné nastaveny, používáme relativní cesty.
  // Předpokládáme, že Nginx (nebo jiný reverse proxy) přesměruje /api a /ws.
  const scheme = window.location.protocol === 'https:' ? 'https' : 'http';
  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = window.location.host;

  backendUrlBase = `${scheme}://${host}/api`;
  websocketUrlBase = `${wsScheme}://${host}/ws`;
} else {
  // Ve vývoji používáme hodnoty z .env souboru.
  backendUrlBase = VITE_BACKEND_URL?.replace(/\/+$/, '') || 'http://localhost:8000/api';
  websocketUrlBase = VITE_BACKEND_WS?.replace(/\/+$/, '') || 'ws://localhost:8000/ws';
}

export const config = {
  api: {
    baseUrl: backendUrlBase,
    endpoints: {
      leaderboardTop: '/leaderboard/top',
      games: '/games',
      leaderboardAggregate: '/leaderboard/aggregate',
      leaderboardRanking: '/leaderboard/ranking',
      playerStats: (username: string) => `/leaderboard/player/${username}`,
    },
  },
  websocket: {
    // Funkce pro získání celé URL pro konkrétní hru
    getGameUrl: (gameCode: string, username: string) =>
      `${websocketUrlBase}/${gameCode}/${username}`,
  },
};
