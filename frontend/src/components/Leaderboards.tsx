import React, { useEffect, useState, useMemo } from 'react';
import { config } from '../config';

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
        const backendBase = config.api.baseUrl;

        const [aggRes, rankRes] = await Promise.all([
          fetch(`${backendBase}${config.api.endpoints.leaderboardAggregate}?limit=20`),
          fetch(`${backendBase}${config.api.endpoints.leaderboardRanking}?limit=20`),
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
        const backendBase = config.api.baseUrl;

        const res = await fetch(`${backendBase}${config.api.endpoints.games}?limit=5`);
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
      const backendBase = config.api.baseUrl;

      const res = await fetch(`${backendBase}${config.api.endpoints.games}?limit=1000`);
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
      <h2 className="text-xl font-bold mb-2">Agregovan� �eb���ek (celkov� sk�re)</h2>
      {loading ? (
        <div>Na��t�n�...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {agg.length === 0 ? (
              <div className="text-gray-400">��dn� data</div>
            ) : (
              <ol className="list-decimal list-inside space-y-2">
                {agg.map((entry) => (
                  <li key={entry.player} className="p-2 bg-gray-700 rounded">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{entry.player}</div>
                        <div className="text-sm text-gray-300">Hry: {entry.games_played} � V�t�zstv�: {entry.wins}</div>
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
              <div className="text-gray-400">��dn� data</div>
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
                        <div className="text-lg font-bold">W:{r.wins} � {r.total_score}</div>
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
        <h3 className="font-semibold mb-2">Posledn� hry</h3>
        {loadingRecent ? (
          <div className="text-gray-300">Na��t�n� posledn�ch her...</div>
        ) : recent.length === 0 ? (
          <div className="text-gray-400">��dn� ned�vn� hry</div>
        ) : (
          <ul className="space-y-2">
            {recent.map((g) => (
              <li key={g.id} className="p-2 bg-gray-700 rounded flex justify-between items-center">
                <div className="cursor-pointer" onClick={() => openDetail(g)}>
                  <div className="font-semibold">{g.winner ?? '�'}</div>
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
            Zobrazit v�echny v�sledky
          </button>
        </div>
      </div>

      {showAll && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-6">
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-4xl text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">V�echny v�sledky</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAll(false)}
                  className="text-gray-300 hover:text-white"
                >
                  Zav��t
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {allResults.length === 0 ? (
                <div className="text-gray-400">��dn� v�sledky k zobrazen�</div>
              ) : (
                <ol className="space-y-2">
                  {currentPageResults.map((g) => (
                    <li key={g.id} className="p-3 bg-gray-700 rounded grid grid-cols-3 gap-4 items-center">
                      <div className="col-span-1">
                        <div className="text-sm text-gray-300">Hra</div>
                        <div className="font-semibold cursor-pointer hover:underline" onClick={() => openDetail(g)}>{g.game_code ?? g.id}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300">V�t�z</div>
                        <div className="font-semibold">{g.winner ?? '�'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-300">�as</div>
                        <div className="font-semibold">{g.played_at ? new Date(g.played_at).toLocaleString() : '�'}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-300">Strana {page} / {totalPages}</div>
              <div className="flex gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Prvn�</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">P�edchoz�</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Dal��</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50">Posledn�</button>
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
                <div className="text-sm text-gray-300">�as: {selectedGame.played_at ? new Date(selectedGame.played_at).toLocaleString() : '�'}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-sm text-gray-300">V�t�z</div>
                <div className="font-semibold">{selectedGame.winner ?? '�'}</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-semibold mb-2">Sk�re hr���</h4>
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
                <div className="text-gray-400">��dn� ulo�en� sk�re pro tuto hru</div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setSelectedGame(null)} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">Zav��t</button>
              <button onClick={() => { setShowAll(true); setSelectedGame(null); }} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Zobrazit v p�ehledu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboards;
