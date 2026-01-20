const { useState, useEffect, useRef } = React;

/* ================= ICONS ================= */
const TrendingUp = ({ className }) => <span className={className}>📈</span>;
const Bell = ({ className }) => <span className={className}>🔔</span>;
const BellOff = ({ className }) => <span className={className}>🔕</span>;
const AlertCircle = ({ className }) => <span className={className}>⚠️</span>;
const RefreshCw = ({ className }) => <span className={className}>🔄</span>;
const Star = ({ className }) => <span className={className}>⭐</span>;
const X = ({ className }) => <span className={className}>❌</span>;
const Settings = ({ className }) => <span className={className}>⚙️</span>;
const Activity = ({ className }) => <span className={className}>📊</span>;
const Eye = ({ className }) => <span className={className}>👁️</span>;

/* ============ HISTORICAL PATTERNS ============ */
const HISTORICAL_RUNNERS = [
  { name: 'WIF', earlyMC: 25000, rapidGrowth: 35 },
  { name: 'BONK', earlyMC: 45000, rapidGrowth: 28 },
  { name: 'POPCAT', earlyMC: 35000, rapidGrowth: 42 },
  { name: 'GOAT', earlyMC: 18000, rapidGrowth: 55 }
];

/* ============ SPARKLINE ============ */
const SimpleSparkline = ({ data }) => {
  if (!data || data.length < 2) {
    return <div className="text-xs text-gray-500">No data</div>;
  }

  const values = data.map(d => d.mc);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const positive = values[values.length - 1] >= values[0];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#4ade80' : '#f87171'}
        strokeWidth="2"
      />
    </svg>
  );
};

/* ================= MAIN APP ================= */
const MemeRunnerScout = () => {
  const [connected, setConnected] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [activeTab, setActiveTab] = useState('discoveries');
  const [notifications, setNotifications] = useState(true);
  const [scoreThreshold, setScoreThreshold] = useState(75);
  const [selectedToken, setSelectedToken] = useState(null);
  const [scanning, setScanning] = useState(false);

  const wsRef = useRef(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    connectWebSocket();
    return () => wsRef.current && wsRef.current.close();
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('wss://api.mainnet-beta.solana.com');
      ws.onopen = () => setConnected(true);
      ws.onerror = () => setConnected(false);
      ws.onclose = () => setConnected(false);
      wsRef.current = ws;
    } catch {}
  };

  const calculateScore = f => {
    let score = 0;
    if (f.rapidGrowth > 40) score += 25;
    else if (f.rapidGrowth > 30) score += 20;
    else score += 10;

    if (f.hasSocials) score += 20;
    if (f.marketCap >= 20000 && f.marketCap <= 80000) score += 15;
    if (f.age < 10) score += 15;
    if (f.volume / f.marketCap > 1) score += 15;

    if (
      HISTORICAL_RUNNERS.some(
        r =>
          Math.abs(r.earlyMC - f.marketCap) < 15000 &&
          Math.abs(r.rapidGrowth - f.rapidGrowth) < 10
      )
    ) {
      score += 10;
    }

    return Math.min(100, score);
  };

  const generateMockToken = () => {
    const names = [
      'PEPE2.0', 'WOJAK', 'DOGE2', 'SHIB3', 'MEME',
      'PUMP', 'MOON', 'LAMBO', 'BASED', 'GIGACHAD',
      'CHAD', 'SIGMA', 'ALPHA', 'ROCKET'
    ];

    const tickers = [
      'PEPE2', 'WOJ', 'DOGE2', 'SHIB3', 'MEME',
      'PUMP', 'MOON', 'LAMBO', 'BASED', 'GIGA',
      'CHAD', 'SIG', 'ALPH', 'RCKT'
    ];

    const idx = Math.floor(Math.random() * names.length);
    const mc = Math.floor(Math.random() * 80000) + 15000;
    const growth = Math.floor(Math.random() * 60) + 10;

    const score = calculateScore({
      marketCap: mc,
      rapidGrowth: growth,
      hasSocials: Math.random() > 0.3,
      age: Math.floor(Math.random() * 20),
      volume: mc * (Math.random() * 2 + 0.5)
    });

    return {
      mint: Math.random().toString(36).slice(2) + 'pump',
      name: names[idx],
      ticker: tickers[idx],
      initialMC: mc,
      currentMC: mc,
      rapidGrowth: growth,
      score,
      timestamp: Date.now(),
      history: [{ time: Date.now(), mc }]
    };
  };

  const manualScan = () => {
    setScanning(true);
    const token = generateMockToken();

    if (token.score >= scoreThreshold) {
      setDiscoveries(d => [token, ...d].slice(0, 50));
      setWatchlist(w =>
        w.find(t => t.mint === token.mint) ? w : [...w, token]
      );
    }

    setTimeout(() => setScanning(false), 400);
  };

  const changePct = t =>
    (((t.currentMC - t.initialMC) / t.initialMC) * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        <TrendingUp /> MemeRunner Scout
      </h1>

      <button
        onClick={manualScan}
        disabled={scanning}
        className="mb-4 px-4 py-2 bg-purple-600 rounded disabled:opacity-50"
      >
        <RefreshCw className={scanning ? 'animate-spin' : ''} /> Scan
      </button>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('discoveries')}>Discoveries</button>
        <button onClick={() => setActiveTab('watchlist')}>Watchlist</button>
      </div>

      {activeTab === 'discoveries' &&
        discoveries.map(t => (
          <TokenCard
            key={t.mint}
            token={t}
            onView={() => setSelectedToken(t)}
          />
        ))}

      {activeTab === 'watchlist' &&
        watchlist.map(t => (
          <WatchlistCard
            key={t.mint}
            token={t}
            onChange={changePct(t)}
            onView={() => setSelectedToken(t)}
            onRemove={() =>
              setWatchlist(w => w.filter(x => x.mint !== t.mint))
            }
          />
        ))}

      {selectedToken && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl mb-2">{selectedToken.name}</h2>
            <button onClick={() => setSelectedToken(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ================= CARDS ================= */
const TokenCard = ({ token, onView }) => (
  <div className="border border-purple-500/30 rounded p-3 mb-2">
    <div className="flex justify-between">
      <div>
        <strong>{token.name}</strong> (${token.ticker})
        <div className="text-sm">Score: {token.score}</div>
      </div>
      <button onClick={onView}>
        <Eye />
      </button>
    </div>
  </div>
);

const WatchlistCard = ({ token, onChange, onRemove, onView }) => {
  const positive = parseFloat(onChange) >= 0;

  return (
    <div className="border border-purple-500/30 rounded p-3 mb-2">
      <div className="flex justify-between mb-2">
        <div>
          <strong>{token.name}</strong> (${token.ticker})
        </div>
        <div className="flex gap-2">
          <button onClick={onView}><Eye /></button>
          <button onClick={onRemove}><X /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 text-sm mb-2">
        <div>${(token.initialMC / 1000).toFixed(1)}k</div>
        <div>${(token.currentMC / 1000).toFixed(1)}k</div>
        <div className={positive ? 'text-green-400' : 'text-red-400'}>
          {positive ? '+' : ''}{onChange}%
        </div>
      </div>

      <div className="h-12">
        <SimpleSparkline data={token.history} />
      </div>
    </div>
  );
};

/* ================= RENDER ================= */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MemeRunnerScout />);
