const CACHE_NAME = 'memerunner-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

---

## Deployment Instructions

### **GitHub Pages (Free)**
1. Create new repository: `memerunner-scout`
2. Push all files to `main` branch
3. Go to Settings → Pages
4. Set source to `main` branch
5. Access at: `https://yourusername.github.io/memerunner-scout`

### **Netlify (Free)**
1. Drag & drop folder to netlify.com/drop
2. Or connect GitHub repo for auto-deploy
3. Custom domain available

### **Vercel (Free)**
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project folder
3. Follow prompts

---

## How It Works

### **Real-time Detection Flow**
1. WebSocket connects to Solana RPC
2. Subscribes to pump.fun program logs
3. Filters for "Create" instructions
4. Extracts mint address from transaction
5. Fetches metadata from pump.fun API
6. Calculates similarity score vs. historical patterns
7. Auto-adds high-score tokens (>75) to watchlist
8. Sends browser notification for exceptional finds (>80)

### **Scoring Algorithm Details**

| Factor | Weight | Criteria |
|--------|--------|----------|
| Bonding Curve Progress | 25pts | >40% growth = 25, >30% = 20, >20% = 15 |
| Social Signals | 20pts | Has Twitter/Telegram + quality description |
| Market Cap Range | 15pts | $20k-$80k sweet spot |
| Age Factor | 15pts | <10min = 15pts, <20min = 10pts |
| Volume Velocity | 15pts | Volume/MC ratio >1.5 = 15pts |
| Historical Match | 10pts | Pattern similarity to WIF, BONK, etc. |

### **Data Persistence**
- **localStorage**: Watchlist and discoveries
- **In-memory**: Live price updates
- **Service Worker**: Offline capability for UI

---

## Example Watchlist Output
```
🚀 PEPE2.0 ($PEPE2) - Score: 92
   Initial MC: $28.5k → Current: $127.3k (+346.7%)
   Added 2h ago | Growth: 45% in 10min
   Socials: ✓ | Match: Similar to WIF pattern
   [Chart showing upward trend]
   
⭐ WOJAK ($WOJ) - Score: 87
   Initial MC: $42.1k → Current: $38.9k (-7.6%)
   Added 45m ago | Growth: 38% in 10min
   Socials: ✓ | Match: Similar to GOAT pattern
   [Chart showing slight decline]
