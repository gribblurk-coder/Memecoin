const { useState, useEffect, useRef } = React;

// Icon components using emojis
const TrendingUp = ({ className }) => <span className={className}>📈</span>;
const Bell = ({ className }) => <span className={className}>🔔</span>;
const BellOff = ({ className }) => <span className={className}>🔕</span>;
const AlertCircle = ({ className }) => <span className={className}>⚠️</span>;
const RefreshCw = ({ className }) => <span className={className}>🔄</span>;
const Star = ({ className }) => <span className={className}>⭐</span>;
const ExternalLink = ({ className }) => <span className={className}>🔗</span>;
const X = ({ className }) => <span className={className}>❌</span>;
const Settings = ({ className }) => <span className={className}>⚙️</span>;
const Activity = ({ className }) => <span className={className}>📊</span>;
const Eye = ({ className }) => <span className={className}>👁️</span>;

// Historical runner patterns
const HISTORICAL_RUNNERS = [
  { name: 'WIF', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', earlyMC: 25000, rapidGrowth: 35, hasSocials: true, creatorHold: 5 },
  { name: 'BONK', mint: '8C4WAXVBx9vdZQKPwqvzQPZ3ymvjwGvHZxfkVnJFpump', earlyMC: 45000, rapidGrowth: 28, hasSocials: true, creatorHold: 8 },
  { name: 'POPCAT', mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', earlyMC: 35000, rapidGrowth: 42, hasSocials: true, creatorHold: 3 },
  { name: 'GOAT', mint: 'CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump', earlyMC: 18000, rapidGrowth: 55, hasSocials: true, creatorHold: 2 },
  { name: 'PNUT', mint: '2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump', earlyMC: 32000, rapidGrowth: 38, hasSocials: true, creatorHold: 6 },
  { name: 'MOO DENG', mint: 'ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY', earlyMC: 28000, rapidGrowth: 45, hasSocials: true, creatorHold: 4 },
  { name: 'FARTCOIN', mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump', earlyMC: 52000, rapidGrowth: 31, hasSocials: true, creatorHold: 7 },
  { name: 'ACT', mint: 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfDgUnpump', earlyMC: 41000, rapidGrowth: 48, hasSocials: true, creatorHold: 5 }
];

// Simple Sparkline component (replaces Recharts)
const SimpleSparkline = ({ data }) => {
  if (!data || data.length < 2) return <div className="text-gray-500 text-sm">No data yet</div>;
  
  const values = data.map(d => d.mc);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  
  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  const isPositive = values[values.length - 1] >= values[0];
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? '#4ade80' : '#f87171'}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const MemeRunnerScout = () => {
  const [connected, setConnected] = useState(false);
  const [watchlist, setWatchlist] = useState([]);
  const [discoveries, setDiscoveries] = useState([]);
  const [activeTab, setActiveTab] = useState('discoveries');
  const [notifications, setNotifications] = useState(true);
  const [scoreThreshold, setScoreThreshold] = useState(75);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  
  const wsRef = useRef(null);
  const updateIntervalRef = useRef(null);

  useEffect(() => {
    initializePWA();
    loadFromStorage();
    connectWebSocket();
    startPeriodicUpdates();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, []);

  const initializePWA = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(err => 
        console.log('SW registration failed:', err)
      );
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('memerunner_watchlist');
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
      const storedDiscoveries = localStorage.getItem('memerunner_discoveries');
      if (storedDiscoveries) {
        setDiscoveries(JSON.parse(storedDiscoveries));
      }
    } catch (err) {
      console.error('Storage load error:', err);
    }
  };

  const saveToStorage = (list, discs) => {
    try {
      localStorage.setItem('memerunner_watchlist', JSON.stringify(list));
      localStorage.setItem('memerunner_discoveries', JSON.stringify(discs));
    } catch (err) {
      console.error('Storage save error:', err);
    }
  };

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket('wss://api.mainnet-beta.solana.com');
      
      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'logsSubscribe',
          params: [
            { mentions: ['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'] },
            { commitment: 'confirmed' }
          ]
        }));
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.params?.result?.value?.logs) {
            const logs = data.params.result.value.logs;
            if (logs.some(log => log.includes('Instruction: Create'))) {
              await handleNewToken(data.params.result.value);
            }
          }
        } catch (err) {
          console.error('WS message error:', err);
        }
      };

      ws.onerror = () => setConnected(false);
      ws.onclose = () => {
        setConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WS connection error:', err);
    }
  };

  const handleNewToken = async (txData) => {
    setScanning(true);
    setLastScan(new Date());
    
    const mockToken = generateMockToken();
    
    if (mockToken.score >= scoreThreshold) {
      const newDiscoveries = [mockToken, ...discoveries].slice(0, 50);
      setDiscoveries(newDiscoveries);
      
      if (mockToken.score >= 80 && notifications && Notification.permission === 'granted') {
        new Notification('🚀 High Score Detection!', {
          body: `${mockToken.name} (${mockToken.ticker}) - Score: ${mockToken.score}`,
          icon: './icon-192.png'
        });
      }
      
      if (mockToken.score >= scoreThreshold) {
        addToWatchlist(mockToken);
      }
      
      saveToStorage(watchlist, newDiscoveries);
    }
    
    setTimeout(() => setScanning(false), 500);
  };

  const generateMockToken = () => {
    const names = ['PEPE2.0', 'WOJAK', 'DOGE2', 'SHIB3', 'MEME', 'PUMP', 'MOON', 'LAMBO', 'BASED', 'GIGACHAD', 'CHAD', 'SIGMA', 'ALPHA', 'ROCKET'];
    const tickers = ['PEPE2', 'WOJ', 'DOGE2', 'SHIB3', 'MEME', 'PUMP', 'MOON', 'LAMBO', 'BASED', 'GIGA', 'CHAD', 'SIG', 'ALPH', 'RCKT'];
    const idx = Math.floor(Math.random() * names.length);
    
    const mc = Math.floor(Math.random() * 80000) + 15000;
    const growth = Math.floor(Math.random() * 60) + 10;
    const hasSocials = Math.random() > 0.3;
    
    const score = calculateScore({
      marketCap: mc,
      rapidGrowth: growth,
      hasSocials,
      age: Math.floor(Math.random() * 20),
      volume: mc * (Math.random() * 2 + 0.5)
    });

    return {
      mint: `${Math.random().toString(36).substring(2, 15)}pump`,
      name: names[idx],
      ticker: tickers[idx],
      initialMC: mc,
      currentMC: mc,
      score,
      timestamp: Date.now(),
      hasSocials,
      rapidGrowth: growth,
      history: [{ time: Date.now(), mc }]
    };
  };

  const calculateScore = (features) => {
    let score = 0;
    
    if (features.rapidGrowth > 40) score += 25;
    else if (features.rapidGrowth > 30) score += 20;
    else if (features.rapidGrowth > 20) score += 15;
    else score += 10;
    
    if (features.hasSocials) score += 20;
    
    if (features.marketCap >= 20000 && features.marketCap <= 80000) score += 15;
    else if (features.marketCap < 20000) score += 10;
    else score += 5;
    
    if (features.age < 10) score += 15;
    else if (features.age < 20) score += 10;
    else score += 5;
    
    const volRatio = features.volume / features.marketCap;
    if (volRatio > 1.5) score += 15;
    else if (volRatio > 1) score += 10;
    else score += 5;
    
    const similarity = HISTORICAL_RUNNERS.some(r => 
      Math.abs(r.earlyMC - features.marketCap) < 15000 && 
      Math.abs(r.rapidGrowth - features.rapidGrowth) < 10
    );
    if (similarity) score += 10;
    
    return Math.min(100, Math.round(score));
  };

  const addToWatchlist = (token) => {
    if (!watchlist.find(t => t.mint === token.mint)) {
      const newWatchlist = [...watchlist, token];
      setWatchlist(newWatchlist);
      saveToStorage(newWatchlist, discoveries);
    }
  };

  const removeFromWatchlist = (mint) => {
    const newWatchlist = watchlist.filter(t => t.mint !== mint);
    setWatchlist(newWatchlist);
    saveToStorage(newWatchlist, discoveries);
  };

  const startPeriodicUpdates = () => {
    updateIntervalRef.current = setInterval(() => {
      setWatchlist(prev => prev.map(token => {
        const change = (Math.random() - 0.4) * 0.15;
        const newMC = Math.max(token.currentMC * (1 + change), 1000);
        return {
          ...token,
          currentMC: newMC,
          history: [...token.history, { time: Date.now(), mc: newMC }].slice(-50)
        };
      }));
    }, 60000);
  };

  const manualScan = () => {
    handleNewToken({});
  };

  const getChangePercent = (token) => {
    return ((token.currentMC - token.initialMC) / token.initialMC * 100).toFixed(2);
  };

  const formatTime = (timestamp) => {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="bg-black/30 backdrop-blur-lg border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-2xl" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                MemeRunner Scout
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                <span>{connected ? 'Live' : 'Offline'}</span>
              </div>
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-lg transition">
                <Settings className="text-xl" />
              </button>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                Last scan: {lastScan ? formatTime(lastScan.getTime()) : 'Never'}
              </span>
              {scanning && <Activity className="text-purple-400 animate-pulse" />}
            </div>
            <button 
              onClick={manualScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition"
            >
              <RefreshCw className={scanning ? 'animate-spin' : ''} />
              Scan Now
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="bg-black/50 backdrop-blur-lg border-b border-purple-500/30 p-4">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span>Notifications</span>
              <button onClick={() => setNotifications(!notifications)} className="p-2">
                {notifications ? <Bell className="text-purple-400" /> : <BellOff className="text-gray-400" />}
              </button>
            </div>
            <div>
              <label className="block mb-2">Score Threshold: {scoreThreshold}</label>
              <input 
                type="range" 
                min="50" 
                max="95" 
                value={scoreThreshold} 
                onChange={(e) => setScoreThreshold(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <button 
              onClick={() => {
                setWatchlist([]);
                setDiscoveries([]);
                localStorage.clear();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg w-full"
            >
              Clear All Data
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 mt-4">
        <div className="flex gap-2 mb-4">
          <button 
            onClick={() => setActiveTab('discoveries')}
            className={`flex-1 py-3 rounded-lg transition ${activeTab === 'discoveries' ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <AlertCircle className="inline mr-2" />
            Discoveries ({discoveries.length})
          </button>
          <button 
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-3 rounded-lg transition ${activeTab === 'watchlist' ? 'bg-purple-600' : 'bg-white/5 hover:bg-white/10'}`}
          >
            <Star className="inline mr-2" />
            Watchlist ({watchlist.length})
          </button>
        </div>

        {activeTab === 'discoveries' && (
          <div className="space-y-3 pb-8">
            {discoveries.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Eye className="text-6xl mx-auto mb-4 opacity-50" />
                <p className="text-lg">Scanning for new launches...</p>
                <p className="text-sm mt-2">High-score tokens will appear here</p>
                <button 
                  onClick={manualScan}
                  className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
                >
                  Trigger Demo Scan
                </button>
              </div>
            ) : (
              discoveries.map(token => (
                <TokenCard 
                  key={token.mint} 
                  token={token} 
                  onAdd={() => addToWatchlist(token)}
                  onView={() => setSelectedToken(token)}
                  showAdd={!watchlist.find(t => t.mint === token.mint)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="space-y-3 pb-8">
            {watchlist.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Star className="text-6xl mx-auto mb-4 opacity-50" />
                <p className="text-lg">Your watchlist is empty</p>
                <p className="text-sm mt-2">High-score discoveries will be added automatically</p>
              </div>
            ) : (
              watchlist.map(token => (
                <WatchlistCard 
                  key={token.mint} 
                  token={token}
                  onChange={getChangePercent(token)}
                  onRemove={() => removeFromWatchlist(token.mint)}
                  onView={() => setSelectedToken(token)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {selectedToken && (
        <TokenDetailModal token={selectedToken} onClose={() => setSelectedToken(null)} />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 mt-8 border-t border-purple-500/30">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-300">
          <strong>⚠️ DISCLAIMER:</strong> For educational/research purposes only. Extremely high risk. Not financial advice. Memecoins can rug or go to zero. Never invest more than you can afford to lose.
        </div>
      </div>
    </div>
  );
};

const TokenCard = ({ token, onAdd, onView, showAdd }) => (
  <div className="bg-white/5 backdrop-blur-lg border border-purple-500/30 rounded-lg p-4 hover:border-purple-400/50 transition">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h3 className="font-bold text-lg">{token.name}</h3>
          <span className="text-gray-400">${token.ticker}</span>
          <span className={`px-2 py-1 rounded text-xs ${
            token.score >= 90 ? 'bg-green-500/20 text-green-400' :
            token.score >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-purple-500/20 text-purple-400'
          }`}>
            Score: {token.score}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">MC:</span> ${(token.initialMC / 1000).toFixed(1)}k
          </div>
          <div>
            <span className="text-gray-400">Growth:</span> {token.rapidGrowth}%
          </div>
          <div>
            <span className="text-gray-400">Age:</span> {Math.floor((Date.now() - token.timestamp) / 60000)}m
          </div>
          <div>
            <span className="text-gray-400">Socials:</span> {token.hasSocials ? '✓' : '✗'}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {showAdd && (
          <button onClick={onAdd} className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition">
            <Star />
          </button>
        )}
        <button onClick={onView} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition">
          <Eye />
        </button>
      </div>
    </div>
  </div>
);

const WatchlistCard = ({ token, onChange, onRemove, onView }) => (
  <div className="bg-white/5 backdrop-blur-lg border border-purple-500/30 rounded-lg p-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="font-bold text-lg">{token.name} (${token.ticker})</h3>
        <span className="text-xs text-gray-400">Added {Math.floor((Date.now() - token.timestamp) / 60000)}m ago</span>
      </div>
      <div className="flex gap-2">
        <button onClick={onView} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition">
          <Eye />
        </button>
        <button onClick={onRemove} className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition">
          <X />
        </button>
      </div>
    </div>
    
    <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
      <div>
        <div className="text-gray-400 text-xs">Initial MC</div>
        <div className="font-semibold">${(token.initialMC / 1000).toFixed(1)}k</div>
      </div>
      <div>
        <div className="text-gray-400 text-xs">Current MC</div>
        <div className="font-semibold">${(token.currentMC / 1000).toFixed(1)}k</div>
      </div>
      <div>
        <div className="inline" />
</a>
</div>
</div>
</div>
</div>
</div>
  </div>
);
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<MemeRunnerScout />);
