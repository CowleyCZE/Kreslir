import React, { useEffect, useState, useMemo } from 'react';

interface AggEntry {
  player: string;
  total_score: number;
  games_played: number;
  wins: number;
  highest_score?: number;
  average_score: number;
  last_seen?: string | null;
}

interface RankEntry {
  player: string;
  wins: number;
  total_score: number;
  games_played: number;
  average_score: number;
  last_seen?: string | null;
}

interface RecentGame {
  id: number | string;
  game_code?: string;
  winner?: string;
  scores?: Record<string, number>;
  timestamp?: string;
  played_at?: string; // alias
}

const Leaderboards: React.FC = () => {
  const [agg, setAgg] = useState<AggEntry[]>([]);
  const [rank, setRank] = useState<RankEntry[]>([]);
  const [recent, setRecent] = useState<RecentGame[]>([]);
  const [allResults, setAllResults] = useState<RecentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedGame, setSelectedGame] = useState<RecentGame | null>(null);

  // pagination for all results (client-side)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const env: any = (import.meta as any);
        const backendBase = (env.env && env.env.VITE_BACKEND_URL)
          ? env.env.VITE_BACKEND_URL.replace(/\/+$/, '')
          : `${window.location.protocol}//${window.location.hostname}:8000`;

        const [aggRes, rankRes] = await Promise.all([
          fetch(`${backendBase}/leaderboard/aggregate?limit=20`),
          fetch(`${backendBase}/leaderboard/ranking?limit=20`),
        ]);
        if (aggRes.ok) setAgg(await aggRes.json());
        if (rankRes.ok) setRank(await rankRes.json());
      } catch (e) {
        console.error('Failed to load leaderboards', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const env: any = (import.meta as any);
        const backendBase = (env.env && env.env.VITE_BACKEND_URL)
          ? env.env.VITE_BACKEND_URL.replace(/\/+$/, '')
          : `${window.location.protocol}//${window.location.hostname}:8000`;

        const res = await fetch(`${backendBase}/games?limit=5`);
        if (res.ok) {
          const data = await res.json();
          // backend returns 'timestamp' field; normalize to played_at for UI
          setRecent(data.map((g: any) => ({ ...g, played_at: g.timestamp })));
        }
      } catch (e) {
        console.error('Failed to load recent results', e);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  const openAllResults = async () => {
    setShowAll(true);
    setPage(1);
    try {
      const env: any = (import.meta as any);
      const backendBase = (env.env && env.env.VITE_BACKEND_URL)
        ? env.env.VITE_BACKEND_URL.replace(/\/+$/, '')
        : `${window.location.protocol}//${window.location.hostname}:8000`;

      const res = await fetch(`${backendBase}/games?limit=1000`);
      if (res.ok) {
        const data = await res.json();
        setAllResults(data.map((g: any) => ({ ...g, played_at: g.timestamp })));
      }
    } catch (e) {
      console.error('Failed to load all results', e);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(allResults.length / pageSize)), [allResults.length]);
  const currentPageResults = useMemo(() => {
    const start = (page - 1) * pageSize;
    return allResults.slice(start, start + pageSize);
  }, [allResults, page]);

  const openDetail = (g: RecentGame) => {
    setSelectedGame(g);
  };

  return (
    <div className="p-4 bg-gray-800 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-2">Agregovaný žebøíèek (celkové skóre)</h2>
      {loading ? (
        <div>Naèítání...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {agg.length === 0 ? (
              <div className="text-gray-400">Žádná data</div>
            ) : (
              <ol className="list-decimal list-inside space-y-2">
                {agg.map((entry) => (
                  <li key={entry.player} className="p-2 bg-gray-700 rounded">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{entry.player}</div>
                        <div className="text-sm text-gray-300">Hry: {entry.games_played} · Vítìzství: {entry.wins}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{entry.total_score}</div>
                        <div className="text-xs text-gray-300">avg {entry.average_score}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <h3 className="font-bold mb-2">Ranking (wins / avg)</h3>
            {rank.length === 0 ? (
              <div className="text-gray-400">Žádná data</div>
            ) : (
              <ol className="list-decimal list-inside space-y-2">
                {rank.map((r) => (
                  <li key={r.player} className="p-2 bg-gray-700 rounded">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{r.player}</div>
                        <div className="text-sm text-gray-300">Hry: {r.games_played}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">W:{r.wins} · {r.total_score}</div>
                        <div className="text-xs text-gray-300">avg {r.average_score}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="font-semibold mb-2">Poslední hry</h3>
        {loadingRecent ? (
          <div className="text-gray-300">Naèítání posledních her...</div>
        ) : recent.length === 0 ? (
          <div className="text-gray-400">Žádné nedávné hry</div>
        ) : (
          <ul className="space-y-2">
            {recent.map((g) => (
              <li key={g.id} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                <div className="cursor-pointer" onClick={() => openDetail(g)}>
                  <div className="font-semibold">{g.winner ?? '—'}</div>
                  <div className="text-sm text-gray-300">{g.played_at ? new Date(g.played_at).toLocaleString() : ''}</div>
                </div>
                <div className="text-sm text-gray-200">{g.game_code ?? ''}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={openAllResults}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-semibold"
          >
            Zobrazit všechny výsledky
          </button>
        </div>
      </div>

      {showAll && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-6">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-4xl text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Všechny výsledky</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-gray-300 hover:text-white"
                >
                  Zavøít
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {allResults.length === 0 ? (
                <div className="text-gray-400">Žádné výsledky k zobrazení</div>
              ) : (
                <ol className="space-y-2">
                  {currentPageResults.map((g) => (
                    <li key={g.id} className="p-3 bg-gray-700 rounded grid grid-cols-3 gap-4 items-center">
                      <div className="col-span-1">
                        <div className="text-sm text-gray-300">Hra</div>
                        <div className="font-semibold cursor-pointer hover:underline" onClick={() => openDetail(g)}>{g.game_code ?? g.id}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300">Vítìz</div>
                        <div className="font-semibold">{g.winner ?? '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-300">Èas</div>
                        <div className="font-semibold">{g.played_at ? new Date(g.played_at).toLocaleString() : '—'}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-300">Strana {page} / {totalPages}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">První</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Pøedchozí</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Další</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Poslední</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedGame && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-6">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-2xl text-white">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-xl font-bold">Hra: {selectedGame.game_code ?? selectedGame.id}</h3>
                <div className="text-sm text-gray-300">Èas: {selectedGame.played_at ? new Date(selectedGame.played_at).toLocaleString() : '—'}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-gray-300">Vítìz</div>
                <div className="font-semibold">{selectedGame.winner ?? '—'}</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Skóre hráèù</h4>
              {selectedGame.scores && Object.keys(selectedGame.scores).length > 0 ? (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {Object.entries(selectedGame.scores).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).map(([player, sc]) => (
                    <li key={player} className="flex justify-between p-2 bg-gray-700 rounded">
                      <div>{player}</div>
                      <div className="font-bold">{sc}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-400">Žádné uložené skóre pro tuto hru</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedGame(null)} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Zavøít</button>
              <button onClick={() => { setShowAll(true); setSelectedGame(null); }} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Zobrazit v pøehledu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboards;
