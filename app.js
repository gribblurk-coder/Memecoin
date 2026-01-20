const { useState, useEffect, useRef } = React;

// Icon components using emojis
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

// Historical runner patterns
const HISTORICAL_RUNNERS = [
  { name: 'WIF', earlyMC: 25000, rapidGrowth: 35 },
  { name: 'BONK', earlyMC: 45000, rapidGrowth: 28 },
  { name: 'POPCAT', earlyMC: 35000, rapidGrowth: 42 },
  { name: 'GOAT', earlyMC: 18000, rapidGrowth: 55 },
];

// Simple Sparkline
const SimpleSparkline = ({ data }) => {
  if (!data || data.length < 2) return <div className="text-xs text-gray-500">No data</div>;
  const values = data.map(d => d.mc);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
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

const MemeRunnerScout = () => {
  const [connected, setConnected] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [activeTab, setActiveTab] = useState('discoveries');
  const [scoreThreshold, setScoreThreshold] = useState(75);
  const [selectedToken, setSelectedToken] = useState(null);
  const [scanning, setScanning] = useState(false);

  const wsRef = useRef(null);

  useEffect(() => {
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
    let s = 0;
    if (f.rapidGrowth > 40) s += 25;
    if (f.hasSocials) s += 20;
    if (f.marketCap >= 20000 && f.marketCap <= 80000) s += 15;
    if (f.age < 10) s += 15;
    if (f.volume / f.marketCap > 1) s += 15;
    if (HISTORICAL_RUNNERS.some(r => Math.abs(r.earlyMC - f.marketCap) < 15000)) s += 10;
    return Math.min(100, s);
  };

  const generateMockToken = () => {
    const mc = Math.floor(Math.random() * 60000) + 20000;
    const growth = Math.floor(Math.random() * 60) + 10;
    const score = calculateScore({
      marketCap: mc,
      rapidGrowth: growth,
      hasSocials: Math.random() > 0.3,
      age: Math.floor(Math.random() * 10),
      volume: mc * (Math.random() + 0.5)
    });

    return {
      mint: Math.random().toString(36),
      name: 'MEME' + Math.floor(Math.random() * 1000),
      ticker: 'MEME',
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
    const t = generateMockToken();
    if (t.score >= scoreThreshold) {
      setDiscoveries(d => [t, ...d]);
      setWatchlist(w => [...w, t]);
    }
    setTimeout(() => setScanning(false), 400);
  };

  const changePct = t => (((t.currentMC - t.initialMC) / t.initialMC) * 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <TrendingUp /> MemeRunner Scout
      </h1>

      <button onClick={manualScan} className="mb-4 px-4 py-2 bg-purple-600 rounded">
        <RefreshCw className={scanning ? 'animate-spin' : ''} /> Scan
      </button>

      {activeTab === 'discoveries' && discoveries.map(t => (
        <TokenCard key={t.mint} token={t} onView={() => setSelectedToken(t)} />
      ))}

      {activeTab === 'watchlist' && watchlist.map(t => (
        <WatchlistCard
          key={t.mint}
          token={t}
          onChange={changePct(t)}
          onView={() => setSelectedToken(t)}
          onRemove={() => setWatchlist(w => w.filter(x => x.mint !== t.mint))}
        />
      ))}

      {selectedToken && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded">
            <h2 className="text-xl">{selectedToken.name}</h2>
            <button onClick={() => setSelectedToken(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TokenCard = ({ token, onView }) => (
  <div className="border border-purple-500/30 rounded p-3 mb-2">
    <div className="flex justify-between">
      <div>
        <strong>{token.name}</strong> (${token.ticker})
        <div>Score: {token.score}</div>
      </div>
      <button onClick={onView}><Eye /></button>
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MemeRunnerScout />);
