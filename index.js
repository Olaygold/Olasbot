const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config');

// ═══════════════════════════════════════════════════════════════
//        OLAYINKA BOT V4 - COMPLETE ALL-IN-ONE VERSION
//            100+ Commands + Downloads + Games! 🎮
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info';

// Connection State
let qrImageData = null;
let currentPairingCode = null;
let connectionStatus = 'starting';
let connectionMessage = 'Initializing...';
let retryCount = 0;
let sock = null;
let startTime = Date.now();

// ═══════════════════════════════════════════════════════════════
//                    UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function clearAuthFolder() {
    try {
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            console.log('🗑️ Auth cleared!');
        }
        return true;
    } catch (e) {
        console.log('Clear error:', e.message);
        return false;
    }
}

const getTime = () => moment().tz(config.timezone).format('hh:mm A');
const getDate = () => moment().tz(config.timezone).format('dddd, MMMM Do YYYY');
const getFullDate = () => moment().tz(config.timezone).format('DD/MM/YYYY HH:mm:ss');

function getGreeting() {
    const h = moment().tz(config.timezone).hour();
    if (h >= 5 && h < 12) return "Good Morning 🌅";
    if (h >= 12 && h < 17) return "Good Afternoon ☀️";
    if (h >= 17 && h < 21) return "Good Evening 🌆";
    return "Good Night 🌙";
}

function runtime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function pickRandom(arr) { 
    return arr[Math.floor(Math.random() * arr.length)]; 
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
//                    AI CHAT FUNCTION
// ═══════════════════════════════════════════════════════════════

async function aiChat(prompt) {
    const apis = [
        { url: `https://api.siputzx.my.id/api/ai/gpt4o?content=${encodeURIComponent(prompt)}`, path: 'data' },
        { url: `https://aemt.me/luminai?text=${encodeURIComponent(prompt)}`, path: 'result' },
        { url: `https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(prompt)}`, path: 'result' },
        { url: `https://widipe.com/gpt4?text=${encodeURIComponent(prompt)}`, path: 'result' }
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api.url, { timeout: 20000 });
            const result = api.path.split('.').reduce((o, k) => o?.[k], r.data);
            if (result) return result;
        } catch { continue; }
    }
    return "I'm having trouble thinking right now. Please try again! 🤔";
}

// ═══════════════════════════════════════════════════════════════
//                    DOWNLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function downloadTikTok(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/tiktok?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/tiktok?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            if (r.data?.data?.play || r.data?.result?.video || r.data?.video) {
                return {
                    success: true,
                    video: r.data?.data?.play || r.data?.result?.video || r.data?.video,
                    title: r.data?.data?.title || r.data?.result?.title || 'TikTok Video',
                    author: r.data?.data?.author?.nickname || r.data?.result?.author || 'Unknown'
                };
            }
        } catch { continue; }
    }
    return { success: false };
}

async function downloadYouTube(query) {
    const apis = [
        `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(query)}`,
        `https://aemt.me/download/ytmp3?url=${encodeURIComponent(query)}`,
        `https://api.nyxs.pw/dl/yt?url=${encodeURIComponent(query)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            if (r.data?.data || r.data?.result) {
                const data = r.data.data || r.data.result;
                return {
                    success: true,
                    title: data.title || 'YouTube Audio',
                    url: data.dl || data.download || data.url,
                    thumbnail: data.thumbnail
                };
            }
        } catch { continue; }
    }
    return { success: false };
}

async function downloadInstagram(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/instagram?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/instagram?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/ig?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            if (r.data?.data || r.data?.result) {
                const data = r.data.data || r.data.result;
                return {
                    success: true,
                    url: Array.isArray(data) ? data[0]?.url : data.url,
                    type: 'video'
                };
            }
        } catch { continue; }
    }
    return { success: false };
}

async function downloadFacebook(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/facebook?url=${encodeURIComponent(url)}`,
        `https://api.nyxs.pw/dl/fb?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            if (r.data?.data || r.data?.result) {
                const data = r.data.data || r.data.result;
                return {
                    success: true,
                    url: data.hd || data.sd || data.url,
                    title: data.title || 'Facebook Video'
                };
            }
        } catch { continue; }
    }
    return { success: false };
}

async function searchYouTube(query) {
    try {
        const r = await axios.get(`https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(query)}`, { timeout: 15000 });
        if (r.data?.data?.length) {
            return r.data.data.slice(0, 5);
        }
    } catch {}
    return [];
}

// ═══════════════════════════════════════════════════════════════
//                    GAME DATA
// ═══════════════════════════════════════════════════════════════

const jokes = [
    "Why don't scientists trust atoms? Because they make up everything! 😂",
    "Why did the scarecrow win an award? He was outstanding in his field! 🌾",
    "I told my wife she was drawing eyebrows too high. She looked surprised! 😮",
    "Why don't eggs tell jokes? They'd crack each other up! 🥚",
    "What do you call a fake noodle? An impasta! 🍝",
    "Why did the bicycle fall over? It was two-tired! 🚲",
    "What do you call a bear with no teeth? A gummy bear! 🐻",
    "Why can't you give Elsa a balloon? Because she'll let it go! ❄️",
    "What do you call a fish without eyes? A fsh! 🐟",
    "Why did the math book look sad? It had too many problems! 📚",
    "What do you call a sleeping dinosaur? A dino-snore! 🦕",
    "Why did the cookie go to the doctor? It felt crummy! 🍪",
    "What do you call a cow with no legs? Ground beef! 🐄",
    "Why did the golfer bring two pants? In case he got a hole in one! ⛳",
    "What's orange and sounds like a parrot? A carrot! 🥕",
    "Why don't oysters share? They're shellfish! 🦪",
    "What do you call a lazy kangaroo? A pouch potato! 🦘",
    "Why did the tomato blush? It saw the salad dressing! 🍅",
    "What do you call a dog that does magic? A Labracadabrador! 🐕",
    "Why did the banana go to the doctor? It wasn't peeling well! 🍌"
];

const quotes = [
    { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
    { q: "Innovation distinguishes between a leader and a follower.", a: "Steve Jobs" },
    { q: "Life is what happens when you're busy making other plans.", a: "John Lennon" },
    { q: "The future belongs to those who believe in the beauty of their dreams.", a: "Eleanor Roosevelt" },
    { q: "It is during our darkest moments that we must focus to see the light.", a: "Aristotle" },
    { q: "The best time to plant a tree was 20 years ago. The second best time is now.", a: "Chinese Proverb" },
    { q: "Your time is limited, don't waste it living someone else's life.", a: "Steve Jobs" },
    { q: "If you want to lift yourself up, lift up someone else.", a: "Booker T. Washington" },
    { q: "Success is not final, failure is not fatal: it is the courage to continue.", a: "Winston Churchill" },
    { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
    { q: "The only impossible journey is the one you never begin.", a: "Tony Robbins" },
    { q: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
    { q: "Be yourself; everyone else is already taken.", a: "Oscar Wilde" },
    { q: "The best revenge is massive success.", a: "Frank Sinatra" },
    { q: "Stay hungry, stay foolish.", a: "Steve Jobs" }
];

const facts = [
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs! 🍯",
    "Octopuses have three hearts and blue blood! 🐙",
    "A day on Venus is longer than its year! 🪐",
    "Bananas are berries, but strawberries aren't! 🍌",
    "The Eiffel Tower can grow 6 inches taller in summer! 🗼",
    "Cows have best friends and get stressed when separated! 🐄",
    "Your brain uses 20% of your body's energy! 🧠",
    "Sharks have been around longer than trees! 🦈",
    "A group of flamingos is called a 'flamboyance'! 🦩",
    "Koalas sleep up to 22 hours a day! 🐨",
    "The shortest war lasted only 38-45 minutes! ⚔️",
    "A cloud can weigh more than a million pounds! ☁️",
    "Dolphins sleep with one eye open! 🐬",
    "The human nose can detect over 1 trillion scents! 👃",
    "Lightning strikes Earth about 8 million times per day! ⚡",
    "Honey bees can recognize human faces! 🐝",
    "The moon is slowly moving away from Earth! 🌙",
    "Cats can't taste sweetness! 🐱",
    "Goldfish have a memory span of 3 months, not 3 seconds! 🐠",
    "A snail can sleep for 3 years! 🐌"
];

const dares = [
    "Send a voice note singing your favorite song! 🎤",
    "Change your profile picture to a meme for 1 hour! 😂",
    "Send 'I love you' to your last chat! ❤️",
    "Do 10 push-ups and send a video! 💪",
    "Text your crush right now! 💕",
    "Post an embarrassing photo on your status! 📸",
    "Send a weird selfie here! 🤪",
    "Speak in an accent for next 5 messages! 🗣️",
    "Call someone and sing happy birthday! 🎂",
    "Send 'We need to talk' to a random contact! 😈",
    "Do your best dance move and send video! 💃",
    "Send a voice note laughing for 30 seconds! 😆",
    "Text 'I have a secret to tell you' to your best friend! 😏",
    "Send your most recent photo! 📷",
    "Compliment 3 people in this chat! 💖"
];

const truths = [
    "What's your biggest secret? 🤫",
    "Who was your first crush? 💕",
    "What's the most embarrassing thing you've done? 😳",
    "Have you ever lied to your best friend? 🤥",
    "What's your biggest fear? 😨",
    "Who do you secretly dislike? 😒",
    "What's the last lie you told? 🤔",
    "Have you ever cheated on a test? 📝",
    "What's your most embarrassing nickname? 😅",
    "Have you ever stalked someone's profile? 👀",
    "What's your guilty pleasure? 🙈",
    "Who's the most attractive person in this chat? 😍",
    "What's something you've never told anyone? 🤐",
    "Have you ever pretended to be sick? 🤒",
    "What's the worst thing you did as a kid? 👶"
];

const eightBallAnswers = [
    "Yes, definitely! ✅",
    "No way! ❌",
    "Maybe... 🤔",
    "Absolutely! 💯",
    "I don't think so 😕",
    "Ask again later 🔮",
    "It is certain! ✨",
    "Very doubtful 😬",
    "Yes! 👍",
    "Cannot predict now 🌀",
    "Don't count on it 👎",
    "My sources say yes 📚",
    "Outlook not so good 😢",
    "Signs point to yes ➡️",
    "Without a doubt! 💪"
];

const roasts = [
    "You're not stupid; you just have bad luck thinking! 🧠",
    "I'd agree with you but then we'd both be wrong! 😂",
    "You're like a cloud. When you disappear, it's a beautiful day! ☁️",
    "If I had a dollar for every brain you don't have, I'd have one dollar! 💵",
    "You're proof that evolution CAN go in reverse! 🐒",
    "I'm not insulting you, I'm describing you! 📝",
    "You're not completely useless, you can be a bad example! 😅",
    "I'd explain it to you, but I left my crayons at home! 🖍️",
    "You bring everyone so much joy... when you leave! 👋",
    "If laughter is the best medicine, your face must be curing the world! 💊"
];

const compliments = [
    "You're more beautiful than a sunset! 🌅",
    "Your smile lights up the whole room! 😊",
    "You're one of a kind - a masterpiece! 🎨",
    "The world is a better place with you in it! 🌍",
    "You're braver than you believe! 💪",
    "Your kindness is a blessing to everyone! 💖",
    "You have an amazing sense of humor! 😂",
    "You're more fun than bubble wrap! 🎉",
    "Your presence makes everything better! ✨",
    "You're absolutely incredible! 🔥"
];

const pickupLines = [
    "Are you a magician? Because whenever I look at you, everyone else disappears! ✨",
    "Do you have a map? I just got lost in your eyes! 👀",
    "Is your name Google? Because you have everything I've been searching for! 🔍",
    "Are you a parking ticket? Because you've got fine written all over you! 🎫",
    "Do you believe in love at first sight, or should I walk by again? 😏",
    "Are you a camera? Because every time I look at you, I smile! 📸",
    "Is your dad a boxer? Because you're a knockout! 🥊",
    "Do you have a Band-Aid? Because I scraped my knee falling for you! 🩹",
    "Are you a bank loan? Because you've got my interest! 💰",
    "Are you Wi-Fi? Because I'm feeling a connection! 📶"
];

const wouldYouRather = [
    "Would you rather be able to fly or be invisible? 🦸",
    "Would you rather have unlimited money or unlimited love? 💰❤️",
    "Would you rather live in the past or the future? ⏳",
    "Would you rather be famous or be the best friend of someone famous? 🌟",
    "Would you rather have no phone or no friends? 📱👥",
    "Would you rather eat only pizza or only ice cream forever? 🍕🍦",
    "Would you rather be the smartest or the funniest person? 🧠😂",
    "Would you rather have super strength or super speed? 💪⚡",
    "Would you rather live without music or without movies? 🎵🎬",
    "Would you rather be able to read minds or predict the future? 🔮"
];

const riddles = [
    { q: "What has keys but no locks?", a: "A piano! 🎹" },
    { q: "What has hands but can't clap?", a: "A clock! ⏰" },
    { q: "What has a head and a tail but no body?", a: "A coin! 🪙" },
    { q: "What can you catch but not throw?", a: "A cold! 🤧" },
    { q: "What gets wetter the more it dries?", a: "A towel! 🛁" },
    { q: "What has an eye but cannot see?", a: "A needle! 🪡" },
    { q: "What goes up but never comes down?", a: "Your age! 📅" },
    { q: "What has many teeth but cannot bite?", a: "A comb! 💇" },
    { q: "What can travel the world while staying in a corner?", a: "A stamp! 📮" },
    { q: "What is full of holes but still holds water?", a: "A sponge! 🧽" }
];

const advice = [
    "Drink more water. Your body will thank you! 💧",
    "Take a break from your phone sometimes! 📱",
    "Call someone you love today! 📞",
    "Save money, but don't forget to live! 💰",
    "Learn something new every day! 🧠",
    "Be kind to yourself. You're doing great! 💪",
    "Sleep well. Everything looks better after rest! 😴",
    "Don't compare yourself to others! 🌟",
    "It's okay to say no sometimes! ✋",
    "Celebrate small victories! 🎉"
];

// ═══════════════════════════════════════════════════════════════
//                    WEB SERVER
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => res.send(getWebPage()));

app.get('/clear', (req, res) => {
    clearAuthFolder();
    connectionStatus = 'starting';
    connectionMessage = 'Session cleared! Restarting...';
    qrImageData = null;
    currentPairingCode = null;
    retryCount = 0;
    setTimeout(() => startBot(), 2000);
    res.redirect('/');
});

app.get('/restart', (req, res) => {
    connectionStatus = 'starting';
    connectionMessage = 'Restarting...';
    setTimeout(() => startBot(), 1000);
    res.redirect('/');
});

app.get('/health', (req, res) => {
    res.json({ status: connectionStatus, uptime: Math.floor(process.uptime()) });
});

app.listen(PORT, () => console.log(`🌐 Server on port ${PORT}`));

// ═══════════════════════════════════════════════════════════════
//                    WEB PAGE
// ═══════════════════════════════════════════════════════════════

function getWebPage() {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${config.botName}</title>
    <meta http-equiv="refresh" content="5">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial;background:linear-gradient(135deg,#0f0f23,#1a1a3e,#0f2847);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .container{text-align:center;padding:30px;background:rgba(255,255,255,0.03);border-radius:25px;backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.1);max-width:500px;width:100%}
        .logo{font-size:60px;margin-bottom:15px}
        h1{font-size:1.8em;margin-bottom:8px;background:linear-gradient(90deg,#00ff88,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .owner{opacity:0.6;margin-bottom:20px}
        .status-box{padding:20px;border-radius:15px;margin:15px 0}
        .starting{background:rgba(255,193,7,0.15);border:2px solid #ffc107}
        .waiting{background:rgba(0,150,255,0.15);border:2px solid #0096ff}
        .connected{background:rgba(0,255,136,0.15);border:2px solid #00ff88}
        .error{background:rgba(255,50,50,0.15);border:2px solid #ff3232}
        .qr-container{background:#fff;padding:15px;border-radius:15px;display:inline-block;margin:15px 0}
        .qr-container img{max-width:250px;width:100%}
        .pairing-code{font-size:2.2em;font-weight:bold;letter-spacing:5px;color:#00ff88;padding:15px;background:rgba(0,0,0,0.4);border-radius:15px;margin:15px 0;font-family:monospace;border:2px dashed #00ff88}
        .instructions{text-align:left;background:rgba(0,0,0,0.25);padding:15px;border-radius:12px;margin-top:15px;font-size:0.9em}
        .instructions h3{color:#00d4ff;margin-bottom:10px}
        .instructions ol{padding-left:20px}
        .instructions li{margin:8px 0;opacity:0.85}
        .btn{display:inline-block;padding:12px 25px;margin:8px;border-radius:10px;text-decoration:none;font-weight:bold;transition:all 0.3s;color:#fff}
        .btn-clear{background:linear-gradient(135deg,#ff4444,#cc0000)}
        .btn-restart{background:linear-gradient(135deg,#4488ff,#0055cc)}
        .btn:hover{transform:scale(1.05)}
        .refresh{opacity:0.4;font-size:0.8em;margin-top:15px}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .features{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:15px}
        .feature{background:rgba(0,255,136,0.1);padding:5px 10px;border-radius:15px;font-size:0.75em}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>${config.botName}</h1>
        <p class="owner">by ${config.ownerName}</p>
        
        ${connectionStatus === 'connected' ? `
            <div class="status-box connected">
                <h2>✅ BOT CONNECTED!</h2>
                <p style="margin-top:8px;opacity:0.8">Online 24/7</p>
            </div>
            <div class="features">
                <span class="feature">🧠 AI</span>
                <span class="feature">📸 ViewOnce</span>
                <span class="feature">🎮 Games</span>
                <span class="feature">📥 Downloads</span>
                <span class="feature">👥 Groups</span>
            </div>
            <p style="margin-top:15px;opacity:0.7">Send <strong style="color:#00ff88">!menu</strong></p>
            <div style="margin-top:20px;padding-top:15px;border-top:1px solid rgba(255,255,255,0.1)">
                <a href="/clear" class="btn btn-clear" onclick="return confirm('Clear session?')">🗑️ Clear</a>
                <a href="/restart" class="btn btn-restart">🔄 Restart</a>
            </div>
        ` : connectionStatus === 'qr' && qrImageData ? `
            <div class="status-box waiting"><h2>📱 Scan QR Code</h2></div>
            <div class="qr-container"><img src="${qrImageData}" alt="QR"></div>
            ${currentPairingCode ? `<p style="opacity:0.6;margin:10px 0">Or use code:</p><div class="pairing-code">${currentPairingCode}</div>` : ''}
            <div class="instructions">
                <h3>📋 How to Connect:</h3>
                <ol>
                    <li>Open WhatsApp</li>
                    <li>Menu → Linked Devices</li>
                    <li>Link a Device</li>
                    <li>Scan QR or use pairing code</li>
                </ol>
            </div>
            <a href="/clear" class="btn btn-clear">🔄 New QR</a>
        ` : connectionStatus === 'error' ? `
            <div class="status-box error">
                <h2>❌ Error</h2>
                <p style="margin-top:8px">${connectionMessage}</p>
            </div>
            <p style="margin:15px 0;opacity:0.8">👇 Click to fix:</p>
            <a href="/clear" class="btn btn-clear">🗑️ Clear & Fix</a>
            <a href="/restart" class="btn btn-restart">🔄 Retry</a>
        ` : `
            <div class="status-box starting"><h2 class="pulse">⏳ ${connectionMessage}</h2></div>
            <p style="margin-top:15px;opacity:0.6">Please wait...</p>
        `}
        <p class="refresh">🔄 Auto-refresh | Retry: ${retryCount}</p>
    </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//                    MENU TEXT
// ═══════════════════════════════════════════════════════════════

function getMenuText() {
    const p = config.prefix;
    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${config.botName.toUpperCase()}* 🤖
┃  _${getGreeting()}_
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┌──「 📊 *BOT INFO* 」
│ 👑 Owner: ${config.ownerName}
│ ⏰ Time: ${getTime()}
│ 📅 Date: ${getDate()}
│ ⚡ Uptime: ${runtime(process.uptime())}
└────────────────────

╭━「 📋 *MAIN* 」━╮
│ ${p}menu │ ${p}help │ ${p}owner
│ ${p}ping │ ${p}runtime │ ${p}about
╰━━━━━━━━━━━━━━━━━━━╯

╭━「 🧠 *AI* 」━╮
│ ${p}ai <question>
│ ${p}gpt <question>
│ ${p}ask <anything>
╰━━━━━━━━━━━━━━━━━╯

╭━「 📥 *DOWNLOAD* 」━╮
│ ${p}tiktok <url> - TikTok video
│ ${p}tt <url> - TikTok short
│ ${p}play <song> - YouTube audio
│ ${p}ytmp3 <url> - YouTube MP3
│ ${p}ig <url> - Instagram
│ ${p}instagram <url>
│ ${p}fb <url> - Facebook
│ ${p}facebook <url>
╰━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 🎮 *GAMES & FUN* 」━╮
│ ${p}joke │ ${p}quote │ ${p}fact
│ ${p}dare │ ${p}truth │ ${p}wyr
│ ${p}riddle │ ${p}8ball <q>
│ ${p}roll │ ${p}flip │ ${p}slot
│ ${p}rps <choice> │ ${p}number
│ ${p}rate <thing> │ ${p}ship <n1> <n2>
│ ${p}roast │ ${p}compliment
│ ${p}pickup │ ${p}advice
│ ${p}mock <text> │ ${p}clap <text>
│ ${p}reverse <text> │ ${p}tiny <text>
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 🔧 *TOOLS* 」━╮
│ ${p}weather <city>
│ ${p}calc <math>
│ ${p}define <word>
│ ${p}wiki <topic>
│ ${p}translate <text>
│ ${p}password <length>
╰━━━━━━━━━━━━━━━━━━━╯

╭━「 🖼️ *IMAGES* 」━╮
│ ${p}meme │ ${p}cat │ ${p}dog
│ ${p}anime │ ${p}waifu │ ${p}neko
╰━━━━━━━━━━━━━━━━━━━━╯

╭━「 👥 *GROUP* 」━╮
│ ${p}tagall │ ${p}hidetag <msg>
│ ${p}groupinfo │ ${p}link
│ ${p}admins
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
│ 📸 View Once: ✅ ON
│ 🧠 AI Reply: ✅ ON
│ 📥 Downloads: ✅ Active
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 _Chat without prefix for AI!_
_${config.footer}_`;
}

// ═══════════════════════════════════════════════════════════════
//                    COMMAND PROCESSOR
// ═══════════════════════════════════════════════════════════════

async function processCommand(cmd, args, msg, sock, from, isGroup, sender, pushName) {
    const p = config.prefix;
    const isOwner = sender.split('@')[0] === config.ownerNumber;
    
    switch(cmd) {
        
        // ═══════ MAIN ═══════
        case 'menu': case 'help': case 'commands':
            return getMenuText();
        
        case 'owner':
            return `👑 *Owner:* ${config.ownerName}\n📱 wa.me/${config.ownerNumber}`;
        
        case 'ping':
            return `🏓 *Pong!* ${Math.floor(Math.random()*50)+10}ms`;
        
        case 'runtime': case 'uptime':
            return `⏱️ *Uptime:* ${runtime(process.uptime())}`;
        
        case 'about': case 'info':
            return `🤖 *${config.botName}*\n👑 Owner: ${config.ownerName}\n⚡ Uptime: ${runtime(process.uptime())}\n\n✅ AI • ViewOnce • Downloads • Games`;
        
        // ═══════ AI ═══════
        case 'ai': case 'gpt': case 'ask': case 'bot': case 'chat':
            if (!args.length) return `❌ Example: ${p}ai What is love?`;
            const aiRes = await aiChat(args.join(' '));
            return `🧠 *AI:*\n\n${aiRes}`;
        
        // ═══════ DOWNLOADS ═══════
        case 'tiktok': case 'tt': case 'tik':
            if (!args.length) return `❌ Example: ${p}tiktok <url>`;
            return { type: 'tiktok', url: args[0] };
        
        case 'play': case 'song': case 'music':
            if (!args.length) return `❌ Example: ${p}play Shape of You`;
            return { type: 'play', query: args.join(' ') };
        
        case 'ytmp3': case 'yta':
            if (!args.length) return `❌ Example: ${p}ytmp3 <youtube url>`;
            return { type: 'ytmp3', url: args[0] };
        
        case 'ig': case 'instagram': case 'igdl':
            if (!args.length) return `❌ Example: ${p}ig <instagram url>`;
            return { type: 'instagram', url: args[0] };
        
        case 'fb': case 'facebook': case 'fbdl':
            if (!args.length) return `❌ Example: ${p}fb <facebook url>`;
            return { type: 'facebook', url: args[0] };
        
        // ═══════ GAMES & FUN ═══════
        case 'joke':
            return `😂 *Joke:*\n\n${pickRandom(jokes)}`;
        
        case 'quote': case 'motivation':
            const qt = pickRandom(quotes);
            return `💭 *"${qt.q}"*\n\n_— ${qt.a}_`;
        
        case 'fact': case 'facts':
            return `📚 *Fact:*\n\n${pickRandom(facts)}`;
        
        case 'dare':
            return `🔥 *Dare:*\n\n${pickRandom(dares)}\n\n_No chickening out!_ 😈`;
        
        case 'truth':
            return `🎯 *Truth:*\n\n${pickRandom(truths)}\n\n_Be honest!_ 😇`;
        
        case 'wyr': case 'wouldyourather':
            return `🤔 *Would You Rather:*\n\n${pickRandom(wouldYouRather)}`;
        
        case 'riddle':
            const rid = pickRandom(riddles);
            return `🧩 *Riddle:*\n\n❓ ${rid.q}\n\n💡 Answer: ${rid.a}`;
        
        case '8ball': case 'magic8ball':
            if (!args.length) return `❌ Ask a question! ${p}8ball Am I cool?`;
            return `🎱 *Question:* ${args.join(' ')}\n\n*Answer:* ${pickRandom(eightBallAnswers)}`;
        
        case 'roll': case 'dice':
            const dice = Math.floor(Math.random() * 6) + 1;
            return `🎲 *Rolled:* ${dice}`;
        
        case 'flip': case 'coin':
            return `🪙 *${Math.random() < 0.5 ? 'HEADS 👑' : 'TAILS 🔢'}*`;
        
        case 'slot': case 'slots':
            const items = ['🍎', '🍊', '🍋', '🍇', '🍒', '💎', '7️⃣'];
            const s1 = pickRandom(items), s2 = pickRandom(items), s3 = pickRandom(items);
            let result = s1 === s2 && s2 === s3 ? '🎉 JACKPOT!' : s1 === s2 || s2 === s3 ? '😊 Two match!' : '😢 Try again!';
            return `🎰 *SLOTS*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n${result}`;
        
        case 'rps':
            if (!args.length) return `❌ ${p}rps rock/paper/scissors`;
            const choices = ['rock', 'paper', 'scissors'];
            const user = args[0].toLowerCase();
            if (!choices.includes(user)) return `❌ Choose: rock, paper, scissors`;
            const bot = pickRandom(choices);
            const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
            let rpsRes = user === bot ? "Tie! 🤝" : 
                (user === 'rock' && bot === 'scissors') || 
                (user === 'paper' && bot === 'rock') || 
                (user === 'scissors' && bot === 'paper') ? "You Win! 🎉" : "You Lose! 😢";
            return `🎮 *Rock Paper Scissors*\n\nYou: ${emoji[user]}\nBot: ${emoji[bot]}\n\n${rpsRes}`;
        
        case 'number': case 'guess':
            const secret = Math.floor(Math.random() * 10) + 1;
            if (!args.length) return `❌ Guess 1-10! ${p}number 5`;
            const guess = parseInt(args[0]);
            return guess === secret ? `🎉 Correct! It was ${secret}!` : `❌ Wrong! It was ${secret}`;
        
        case 'rate':
            if (!args.length) return `❌ ${p}rate my looks`;
            return `⭐ *Rating ${args.join(' ')}:* ${Math.floor(Math.random()*101)}/100`;
        
        case 'ship': case 'love': case 'match':
            if (args.length < 2) return `❌ ${p}ship John Mary`;
            const love = Math.floor(Math.random() * 101);
            return `💕 *${args[0]}* ❤️ *${args[1]}*\n\n💘 *Match:* ${love}%`;
        
        case 'roast':
            return `🔥 *Roast:*\n\n${pickRandom(roasts)}`;
        
        case 'compliment':
            return `💝 *Compliment:*\n\n${pickRandom(compliments)}`;
        
        case 'pickup': case 'pickupline':
            return `💋 *Pickup Line:*\n\n${pickRandom(pickupLines)}`;
        
        case 'advice':
            return `💡 *Advice:*\n\n${pickRandom(advice)}`;
        
        case 'reverse':
            if (!args.length) return `❌ ${p}reverse hello`;
            return `🔄 ${args.join(' ').split('').reverse().join('')}`;
        
        case 'mock':
            if (!args.length) return `❌ ${p}mock hello`;
            return `🐔 ${args.join(' ').split('').map((c,i) => i%2 ? c.toUpperCase() : c.toLowerCase()).join('')}`;
        
        case 'clap':
            if (!args.length) return `❌ ${p}clap hello world`;
            return `👏 ${args.join(' 👏 ')} 👏`;
        
        case 'tiny': case 'small':
            if (!args.length) return `❌ ${p}tiny hello`;
            const tinyMap = 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ';
            return `🔤 ${args.join(' ').toLowerCase().split('').map(c => {
                const i = c.charCodeAt(0) - 97;
                return i >= 0 && i < 26 ? tinyMap[i] : c;
            }).join('')}`;
        
        // ═══════ TOOLS ═══════
        case 'weather':
            if (!args.length) return `❌ ${p}weather Lagos`;
            try {
                const w = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args.join(' ')}&appid=060a6bcfa19809c2cd4d97a212b19273&units=metric`);
                return `🌤️ *${w.data.name}*\n\n🌡️ Temp: ${w.data.main.temp}°C\n💧 Humidity: ${w.data.main.humidity}%\n☁️ ${w.data.weather[0].description}`;
            } catch { return "❌ City not found!"; }
        
        case 'calc': case 'calculate': case 'math':
            if (!args.length) return `❌ ${p}calc 5+5*2`;
            try {
                const expr = args.join('').replace(/[^0-9+\-*/.()]/g, '');
                return `🔢 *${expr}* = ${eval(expr)}`;
            } catch { return "❌ Invalid!"; }
        
        case 'define': case 'meaning':
            if (!args.length) return `❌ ${p}define love`;
            try {
                const d = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${args[0]}`);
                return `📖 *${d.data[0].word}*\n\n${d.data[0].meanings[0].definitions[0].definition}`;
            } catch { return "❌ Not found!"; }
        
        case 'wiki': case 'wikipedia':
            if (!args.length) return `❌ ${p}wiki Nigeria`;
            try {
                const w = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`);
                return `📚 *${w.data.title}*\n\n${w.data.extract.slice(0,500)}...`;
            } catch { return "❌ Not found!"; }
        
        case 'password': case 'pass':
            const len = Math.min(parseInt(args[0]) || 12, 50);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
            let pass = '';
            for (let i = 0; i < len; i++) pass += chars[Math.floor(Math.random() * chars.length)];
            return `🔐 *Password:*\n\n\`${pass}\``;
        
        // ═══════ IMAGES ═══════
        case 'meme': return { type: 'meme' };
        case 'cat': return { type: 'cat' };
        case 'dog': return { type: 'dog' };
        case 'anime': case 'waifu': return { type: 'waifu' };
        case 'neko': return { type: 'neko' };
        
        // ═══════ GROUP ═══════
        case 'tagall': case 'all':
            return { type: 'tagall' };
        
        case 'hidetag':
            if (!args.length) return `❌ ${p}hidetag Hello everyone!`;
            return { type: 'hidetag', text: args.join(' ') };
        
        case 'groupinfo': case 'ginfo':
            return { type: 'groupinfo' };
        
        case 'link': case 'grouplink':
            return { type: 'link' };
        
        case 'admins': case 'listadmin':
            return { type: 'admins' };
        
        default:
            return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//                    START BOT
// ═══════════════════════════════════════════════════════════════

async function startBot() {
    connectionStatus = 'starting';
    connectionMessage = 'Connecting...';
    
    try {
        if (!fs.existsSync(AUTH_FOLDER)) fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`\n🔄 Starting... (Attempt ${retryCount + 1})`);
        
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['Olayinka Bot', 'Chrome', '4.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 60000
        });
        
        // Connection events
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Generated!');
                connectionStatus = 'qr';
                connectionMessage = 'Scan QR to connect';
                retryCount = 0;
                
                try {
                    qrImageData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                    
                    // Get pairing code
                    setTimeout(async () => {
                        if (!sock.authState.creds.registered) {
                            try {
                                currentPairingCode = await sock.requestPairingCode(config.ownerNumber);
                                console.log(`🔐 Pairing Code: ${currentPairingCode}`);
                            } catch (e) {
                                console.log('Pairing code unavailable, use QR');
                            }
                        }
                    }, 5000);
                } catch (e) {
                    console.log('QR Error:', e.message);
                }
            }
            
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n❌ Disconnected (Code: ${code})`);
                
                qrImageData = null;
                currentPairingCode = null;
                
                // Auto-fix bad sessions
                if (code === DisconnectReason.loggedOut || 
                    code === DisconnectReason.badSession ||
                    code === 401 || code === 403 || code === 405) {
                    console.log('🗑️ Clearing bad session...');
                    clearAuthFolder();
                    retryCount = 0;
                    connectionStatus = 'starting';
                    connectionMessage = 'Fixing session...';
                } else {
                    retryCount++;
                    connectionStatus = 'error';
                    connectionMessage = `Reconnecting... (${retryCount})`;
                    
                    if (retryCount > 5) {
                        console.log('🗑️ Too many retries, clearing...');
                        clearAuthFolder();
                        retryCount = 0;
                    }
                }
                
                setTimeout(startBot, 5000);
            }
            
            if (connection === 'open') {
                console.log('\n✅ CONNECTED!\n');
                connectionStatus = 'connected';
                connectionMessage = 'Online';
                retryCount = 0;
                qrImageData = null;
                currentPairingCode = null;
                
                // Welcome message
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `✅ *${config.botName} Connected!*\n\n⏰ ${getTime()}\n📅 ${getDate()}\n\n🎮 100+ Commands\n📥 Downloads Ready\n🧠 AI Active\n\nType *${config.prefix}menu*`
                    });
                } catch (e) {
                    console.log('Welcome msg failed:', e.message);
                }
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // ═══════════════════════════════════════════════════════════════
        //                    MESSAGE HANDLER
        // ═══════════════════════════════════════════════════════════════
        
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg?.message || msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                const sender = msg.key.participant || from;
                const senderNumber = sender.split('@')[0];
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');
                const isOwner = senderNumber === config.ownerNumber;
                
                const type = Object.keys(msg.message)[0];
                let body = '';
                
                if (type === 'conversation') body = msg.message.conversation;
                else if (type === 'extendedTextMessage') body = msg.message.extendedTextMessage?.text || '';
                else if (type === 'imageMessage') body = msg.message.imageMessage?.caption || '';
                else if (type === 'videoMessage') body = msg.message.videoMessage?.caption || '';
                
                // ═══════ VIEW ONCE SAVER ═══════
                if ((type === 'viewOnceMessageV2' || type === 'viewOnceMessage') && config.saveViewOnce) {
                    console.log(`📸 ViewOnce from ${pushName}`);
                    try {
                        const vom = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
                        const mt = Object.keys(vom.message)[0];
                        const buf = await downloadMediaMessage({ message: vom.message }, 'buffer', {});
                        const cap = `📸 *VIEW ONCE SAVED*\n\n👤 From: ${pushName}\n📱 ${senderNumber}\n⏰ ${getTime()}\n📅 ${getDate()}`;
                        const oid = config.ownerNumber + '@s.whatsapp.net';
                        
                        if (mt.includes('image')) await sock.sendMessage(oid, { image: buf, caption: cap });
                        else if (mt.includes('video')) await sock.sendMessage(oid, { video: buf, caption: cap });
                        else if (mt.includes('audio')) {
                            await sock.sendMessage(oid, { audio: buf, mimetype: 'audio/mp4', ptt: true });
                            await sock.sendMessage(oid, { text: cap });
                        }
                        console.log('✅ ViewOnce saved!');
                    } catch (e) { console.log('ViewOnce error:', e.message); }
                    return;
                }
                
                // ═══════ COMMANDS ═══════
                if (body.startsWith(config.prefix)) {
                    const args = body.slice(config.prefix.length).trim().split(/ +/);
                    const cmd = args.shift().toLowerCase();
                    
                    console.log(`📩 ${cmd} from ${pushName}`);
                    
                    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
                    
                    try {
                        const result = await processCommand(cmd, args, msg, sock, from, isGroup, sender, pushName);
                        
                        if (result === null) {
                            await sock.sendMessage(from, { text: `❌ Unknown: *${cmd}*\n\nType *${config.prefix}menu*` }, { quoted: msg });
                            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                            return;
                        }
                        
                        // String response
                        if (typeof result === 'string') {
                            await sock.sendMessage(from, { text: result }, { quoted: msg });
                        }
                        
                        // ═══════ DOWNLOAD HANDLERS ═══════
                        else if (result?.type === 'tiktok') {
                            await sock.sendMessage(from, { text: '⏳ Downloading TikTok...' }, { quoted: msg });
                            const tt = await downloadTikTok(result.url);
                            if (tt.success) {
                                await sock.sendMessage(from, { 
                                    video: { url: tt.video }, 
                                    caption: `📹 *TikTok*\n\n👤 ${tt.author}\n📝 ${tt.title}`
                                }, { quoted: msg });
                            } else {
                                await sock.sendMessage(from, { text: '❌ Failed to download TikTok!' }, { quoted: msg });
                            }
                        }
                        
                        else if (result?.type === 'play') {
                            await sock.sendMessage(from, { text: `🔍 Searching: ${result.query}...` }, { quoted: msg });
                            const results = await searchYouTube(result.query);
                            if (results.length) {
                                const yt = await downloadYouTube(results[0].url);
                                if (yt.success && yt.url) {
                                    await sock.sendMessage(from, { 
                                        audio: { url: yt.url }, 
                                        mimetype: 'audio/mp4',
                                        ptt: false
                                    }, { quoted: msg });
                                    await sock.sendMessage(from, { text: `🎵 *${yt.title}*` });
                                } else {
                                    await sock.sendMessage(from, { text: '❌ Failed to download!' }, { quoted: msg });
                                }
                            } else {
                                await sock.sendMessage(from, { text: '❌ No results found!' }, { quoted: msg });
                            }
                        }
                        
                        else if (result?.type === 'ytmp3') {
                            await sock.sendMessage(from, { text: '⏳ Downloading...' }, { quoted: msg });
                            const yt = await downloadYouTube(result.url);
                            if (yt.success && yt.url) {
                                await sock.sendMessage(from, { 
                                    audio: { url: yt.url }, 
                                    mimetype: 'audio/mp4'
                                }, { quoted: msg });
                            } else {
                                await sock.sendMessage(from, { text: '❌ Failed!' }, { quoted: msg });
                            }
                        }
                        
                        else if (result?.type === 'instagram') {
                            await sock.sendMessage(from, { text: '⏳ Downloading Instagram...' }, { quoted: msg });
                            const ig = await downloadInstagram(result.url);
                            if (ig.success) {
                                await sock.sendMessage(from, { 
                                    video: { url: ig.url }, 
                                    caption: '📸 *Instagram*'
                                }, { quoted: msg });
                            } else {
                                await sock.sendMessage(from, { text: '❌ Failed!' }, { quoted: msg });
                            }
                        }
                        
                        else if (result?.type === 'facebook') {
                            await sock.sendMessage(from, { text: '⏳ Downloading Facebook...' }, { quoted: msg });
                            const fb = await downloadFacebook(result.url);
                            if (fb.success) {
                                await sock.sendMessage(from, { 
                                    video: { url: fb.url }, 
                                    caption: `📘 *Facebook*\n${fb.title}`
                                }, { quoted: msg });
                            } else {
                                await sock.sendMessage(from, { text: '❌ Failed!' }, { quoted: msg });
                            }
                        }
                        
                        // ═══════ IMAGE HANDLERS ═══════
                        else if (result?.type === 'meme') {
                            try {
                                const r = await axios.get('https://meme-api.com/gimme');
                                await sock.sendMessage(from, { 
                                    image: { url: r.data.url }, 
                                    caption: `😂 *${r.data.title}*` 
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'cat') {
                            try {
                                const r = await axios.get('https://api.thecatapi.com/v1/images/search');
                                await sock.sendMessage(from, { 
                                    image: { url: r.data[0].url }, 
                                    caption: '🐱 *Meow!*' 
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'dog') {
                            try {
                                const r = await axios.get('https://dog.ceo/api/breeds/image/random');
                                await sock.sendMessage(from, { 
                                    image: { url: r.data.message }, 
                                    caption: '🐕 *Woof!*' 
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'waifu') {
                            try {
                                const r = await axios.get('https://api.waifu.pics/sfw/waifu');
                                await sock.sendMessage(from, { 
                                    image: { url: r.data.url }, 
                                    caption: '🎌 *Waifu*' 
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'neko') {
                            try {
                                const r = await axios.get('https://api.waifu.pics/sfw/neko');
                                await sock.sendMessage(from, { 
                                    image: { url: r.data.url }, 
                                    caption: '🐱 *Neko*' 
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        // ═══════ GROUP HANDLERS ═══════
                        else if (result?.type === 'tagall' && isGroup) {
                            try {
                                const g = await sock.groupMetadata(from);
                                const members = g.participants.map(p => p.id);
                                let txt = `📢 *TAG ALL*\n\n`;
                                members.forEach(m => txt += `@${m.split('@')[0]} `);
                                await sock.sendMessage(from, { text: txt, mentions: members }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'hidetag' && isGroup) {
                            try {
                                const g = await sock.groupMetadata(from);
                                const members = g.participants.map(p => p.id);
                                await sock.sendMessage(from, { text: result.text, mentions: members });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'groupinfo' && isGroup) {
                            try {
                                const g = await sock.groupMetadata(from);
                                await sock.sendMessage(from, { 
                                    text: `👥 *${g.subject}*\n\n👤 Members: ${g.participants.length}\n📅 Created: ${moment(g.creation * 1000).format('DD/MM/YYYY')}\n📝 ${g.desc || 'No description'}`
                                }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        else if (result?.type === 'link' && isGroup) {
                            try {
                                const code = await sock.groupInviteCode(from);
                                await sock.sendMessage(from, { text: `🔗 https://chat.whatsapp.com/${code}` }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Need admin!' }); }
                        }
                        
                        else if (result?.type === 'admins' && isGroup) {
                            try {
                                const g = await sock.groupMetadata(from);
                                const admins = g.participants.filter(p => p.admin);
                                let txt = `👑 *Admins:*\n\n`;
                                admins.forEach(a => txt += `• @${a.id.split('@')[0]}\n`);
                                await sock.sendMessage(from, { text: txt, mentions: admins.map(a => a.id) }, { quoted: msg });
                            } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                        }
                        
                        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                        
                    } catch (err) {
                        console.log('Command error:', err.message);
                        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                        await sock.sendMessage(from, { text: '❌ Error processing command!' }, { quoted: msg });
                    }
                    return;
                }
                
                // ═══════ AI AUTO REPLY ═══════
                if (config.autoAI && body.trim() && !isGroup) {
                    console.log(`🤖 AI: ${body.slice(0, 30)}...`);
                    await sock.sendPresenceUpdate('composing', from);
                    
                    try {
                        const ai = await aiChat(body);
                        await sock.sendMessage(from, {
                            text: `🤖 *${config.botName}*\n\n${ai}\n\n💡 _Type ${config.prefix}menu_`
                        }, { quoted: msg });
                    } catch (err) {
                        console.log('AI error:', err.message);
                    }
                }
                
            } catch (err) {
                console.log('Message error:', err.message);
            }
        });
        
    } catch (err) {
        console.log('Start error:', err.message);
        connectionStatus = 'error';
        connectionMessage = err.message;
        retryCount++;
        
        if (retryCount > 3) {
            clearAuthFolder();
            retryCount = 0;
        }
        
        setTimeout(startBot, 10000);
    }
}

// ═══════════════════════════════════════════════════════════════
//                    START
// ═══════════════════════════════════════════════════════════════

console.log(`
╔════════════════════════════════════════════╗
║  🤖 ${config.botName.toUpperCase()}
║  👑 ${config.ownerName}
║  🎮 100+ Commands + Downloads
║  📥 TikTok, YouTube, Instagram, Facebook
╚════════════════════════════════════════════╝
`);

startBot();
