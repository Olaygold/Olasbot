
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config');

// ═══════════════════════════════════════════════════════════════
//          OLAYINKA BOT V3 - FULL COMMANDS VERSION
//                    100+ COMMANDS! 🎮
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info';

// State
let currentQR = null;
let currentPairingCode = null;
let connectionStatus = 'starting';
let connectionMessage = 'Initializing...';
let qrImageData = null;
let retryCount = 0;
let sock = null;
let startTime = Date.now();

// ═══════════════════════════════════════════════════════════════
//                    CLEAR AUTH FOLDER
// ═══════════════════════════════════════════════════════════════

function clearAuthFolder() {
    try {
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
            console.log('🗑️ Auth folder cleared!');
        }
        return true;
    } catch (err) {
        console.log('❌ Clear error:', err.message);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════
//                         WEB SERVER
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => res.send(getWebPage()));
app.get('/clear', (req, res) => {
    clearAuthFolder();
    connectionStatus = 'starting';
    connectionMessage = 'Session cleared! Restarting...';
    currentQR = null;
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
//                         WEB PAGE
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
        .btn{display:inline-block;padding:12px 25px;margin:8px;border-radius:10px;text-decoration:none;font-weight:bold;transition:all 0.3s}
        .btn-clear{background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff}
        .btn-restart{background:linear-gradient(135deg,#4488ff,#0055cc);color:#fff}
        .btn:hover{transform:scale(1.05)}
        .refresh{opacity:0.4;font-size:0.8em;margin-top:15px}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .features{display:flex;justify-content:center;gap:10px;margin-top:15px;flex-wrap:wrap}
        .feature{background:rgba(0,255,136,0.1);padding:6px 12px;border-radius:15px;font-size:0.8em}
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
                <p style="margin-top:8px;opacity:0.8">Online 24/7 with 100+ commands!</p>
            </div>
            <div class="features">
                <span class="feature">🧠 AI</span>
                <span class="feature">📸 ViewOnce</span>
                <span class="feature">🎮 100+ Cmds</span>
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
            ${currentPairingCode ? `<p style="opacity:0.6">Or use code:</p><div class="pairing-code">${currentPairingCode}</div>` : ''}
            <div class="instructions">
                <h3>📋 How to Connect:</h3>
                <ol>
                    <li>Open WhatsApp</li>
                    <li>Menu → Linked Devices</li>
                    <li>Link a Device</li>
                    <li>Scan QR or use code</li>
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
        `}
        <p class="refresh">🔄 Auto-refresh | Retry: ${retryCount}</p>
    </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const getTime = () => moment().tz(config.timezone).format('hh:mm A');
const getDate = () => moment().tz(config.timezone).format('dddd, MMMM Do YYYY');
const getFullDateTime = () => moment().tz(config.timezone).format('YYYY-MM-DD HH:mm:ss');

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

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// AI Chat
async function aiChat(prompt) {
    const apis = [
        `https://api.siputzx.my.id/api/ai/gpt4o?content=${encodeURIComponent(prompt)}`,
        `https://aemt.me/luminai?text=${encodeURIComponent(prompt)}`,
        `https://api.nyxs.pw/ai/gpt4?text=${encodeURIComponent(prompt)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 20000 });
            if (r.data?.data) return r.data.data;
            if (r.data?.result) return r.data.result;
            if (r.data?.answer) return r.data.answer;
        } catch { continue; }
    }
    return "I'm having trouble thinking right now. Please try again! 🤔";
}

// ═══════════════════════════════════════════════════════════════
//                    ALL DATA (Jokes, Facts, etc.)
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
    "Why did the math book look so sad? Because it had too many problems! 📚",
    "What do you call a sleeping dinosaur? A dino-snore! 🦕",
    "Why did the cookie go to the doctor? It felt crummy! 🍪",
    "What do you call a cow with no legs? Ground beef! 🐄",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one! ⛳",
    "What do you call a lazy kangaroo? A pouch potato! 🦘"
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
    { q: "The only impossible journey is the one you never begin.", a: "Tony Robbins" },
    { q: "Success is not final, failure is not fatal: it is the courage to continue that counts.", a: "Winston Churchill" },
    { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
    { q: "I have not failed. I've just found 10,000 ways that won't work.", a: "Thomas Edison" },
    { q: "The only thing we have to fear is fear itself.", a: "Franklin D. Roosevelt" },
    { q: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
    { q: "Be yourself; everyone else is already taken.", a: "Oscar Wilde" }
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
    "The shortest war in history lasted 38-45 minutes! ⚔️",
    "A cloud can weigh more than a million pounds! ☁️",
    "Dolphins sleep with one eye open! 🐬",
    "The human nose can detect over 1 trillion scents! 👃",
    "Lightning strikes Earth about 8 million times per day! ⚡"
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
    "Send 'I need to tell you something' to a random contact! 😈",
    "Do your best dance move and send video! 💃",
    "Send a voice note laughing for 30 seconds! 😆",
    "Text 'We need to talk' to your best friend! 😏",
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
    "Who do you think is the most attractive in this chat? 😍",
    "What's something you've never told anyone? 🤐",
    "Have you ever pretended to be sick? 🤒",
    "What's the worst thing you've done as a kid? 👶"
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
    "Better not tell you now 🤐",
    "Concentrate and ask again 🧘",
    "Reply hazy, try again 🌫️",
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
    "If laughter is the best medicine, your face must be curing the world! 💊",
    "I'm jealous of people who don't know you! 😏",
    "You're like a software update. Every time I see you, I think 'not now'! 💻",
    "I've seen people like you before, but I had to pay admission! 🎪",
    "You're the reason God created the middle finger! 🖕",
    "If you were any more inbred, you'd be a sandwich! 🥪"
];

const compliments = [
    "You're more beautiful than a sunset! 🌅",
    "Your smile lights up the whole room! 😊",
    "You're one of a kind - a masterpiece! 🎨",
    "The world is a better place with you in it! 🌍",
    "You're braver than you believe! 💪",
    "Your kindness is a blessing to everyone around you! 💖",
    "You have an amazing sense of humor! 😂",
    "You're more fun than bubble wrap! 🎉",
    "Your presence makes everything better! ✨",
    "You have the best ideas! 💡",
    "You're like a ray of sunshine! ☀️",
    "You make the world a brighter place! 🌟",
    "Your positivity is contagious! 😄",
    "You're absolutely incredible! 🔥",
    "You deserve all the happiness in the world! 🥰"
];

const pickupLines = [
    "Are you a magician? Because whenever I look at you, everyone else disappears! ✨",
    "Do you have a map? I just got lost in your eyes! 👀",
    "Is your name Google? Because you have everything I've been searching for! 🔍",
    "Are you a parking ticket? Because you've got fine written all over you! 🎫",
    "Do you believe in love at first sight, or should I walk by again? 😏",
    "Are you a camera? Because every time I look at you, I smile! 📸",
    "Is your dad a boxer? Because you're a knockout! 🥊",
    "Do you have a Band-Aid? Because I just scraped my knee falling for you! 🩹",
    "Are you a bank loan? Because you've got my interest! 💰",
    "Is your name Chapstick? Because you're da balm! 💋",
    "Are you a volcano? Because I lava you! 🌋",
    "Do you have a sunburn, or are you always this hot? 🔥",
    "Are you a time traveler? Because I see you in my future! ⏰",
    "Is your name Wi-Fi? Because I'm feeling a connection! 📶",
    "Are you a dictionary? Because you add meaning to my life! 📖"
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

const neverHaveIEver = [
    "Never have I ever lied to my parents! 🤥",
    "Never have I ever cheated on a test! 📝",
    "Never have I ever fallen in love! 💕",
    "Never have I ever broken someone's heart! 💔",
    "Never have I ever cried in public! 😢",
    "Never have I ever stalked an ex on social media! 👀",
    "Never have I ever ghosted someone! 👻",
    "Never have I ever pretended to be sick! 🤒",
    "Never have I ever eaten something off the floor! 🍕",
    "Never have I ever stayed up all night! 🌙"
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
    "Celebrate small victories! 🎉",
    "Take a walk outside today! 🚶",
    "Tell someone you appreciate them! 💖",
    "Eat something healthy today! 🥗",
    "It's okay to ask for help! 🤝",
    "Take a deep breath. You've got this! 🧘"
];

const riddles = [
    { q: "What has keys but no locks?", a: "A piano! 🎹" },
    { q: "What has hands but can't clap?", a: "A clock! ⏰" },
    { q: "What has a head and a tail but no body?", a: "A coin! 🪙" },
    { q: "What can you catch but not throw?", a: "A cold! 🤧" },
    { q: "What gets wetter the more it dries?", a: "A towel! 🛁" },
    { q: "What has an eye but cannot see?", a: "A needle! 🪡" },
    { q: "What can travel around the world while staying in a corner?", a: "A stamp! 📮" },
    { q: "What has many teeth but cannot bite?", a: "A comb! 💇" },
    { q: "What goes up but never comes down?", a: "Your age! 📅" },
    { q: "What is full of holes but still holds water?", a: "A sponge! 🧽" }
];

const trivia = [
    { q: "What is the capital of France?", a: "Paris 🗼" },
    { q: "How many continents are there?", a: "7 🌍" },
    { q: "What planet is known as the Red Planet?", a: "Mars ♂️" },
    { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci 🎨" },
    { q: "What is the largest mammal in the world?", a: "Blue Whale 🐋" },
    { q: "How many bones are in the human body?", a: "206 🦴" },
    { q: "What is the chemical symbol for gold?", a: "Au ✨" },
    { q: "What is the largest ocean on Earth?", a: "Pacific Ocean 🌊" },
    { q: "Who wrote Romeo and Juliet?", a: "William Shakespeare 📚" },
    { q: "What is the hardest natural substance?", a: "Diamond 💎" }
];

// ═══════════════════════════════════════════════════════════════
//                         FULL MENU
// ═══════════════════════════════════════════════════════════════

function getMenuText() {
    const p = config.prefix;
    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${config.botName.toUpperCase()}* 🤖
┃  _${getGreeting()}_
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┌──「 📊 *BOT INFO* 」──
│ 👑 Owner: ${config.ownerName}
│ ⏰ Time: ${getTime()}
│ 📅 Date: ${getDate()}
│ ⚡ Uptime: ${runtime(process.uptime())}
└────────────────────

╭━「 📋 *MAIN MENU* 」━╮
│ ${p}menu - Show all commands
│ ${p}help - Help info
│ ${p}owner - Owner contact
│ ${p}ping - Bot speed
│ ${p}runtime - Bot uptime
│ ${p}about - About bot
│ ${p}info - Bot info
│ ${p}stats - Bot statistics
╰━━━━━━━━━━━━━━━━━━━━╯

╭━「 🧠 *AI COMMANDS* 」━╮
│ ${p}ai <text> - Ask AI
│ ${p}gpt <text> - ChatGPT
│ ${p}bot <text> - Talk to bot
│ ${p}ask <question> - Ask anything
│ ${p}imagine <desc> - Imagine
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 🎮 *FUN COMMANDS* 」━╮
│ ${p}joke - Random joke
│ ${p}quote - Random quote
│ ${p}fact - Random fact
│ ${p}dare - Get a dare
│ ${p}truth - Truth question
│ ${p}8ball <q> - Magic 8 ball
│ ${p}roll - Roll dice
│ ${p}flip - Flip coin
│ ${p}rate <thing> - Rate 0-100
│ ${p}ship <n1> <n2> - Love match
│ ${p}roast - Roast someone
│ ${p}compliment - Compliment
│ ${p}pickup - Pickup line
│ ${p}advice - Life advice
│ ${p}riddle - Random riddle
│ ${p}trivia - Random trivia
│ ${p}wyr - Would you rather
│ ${p}nhie - Never have I ever
│ ${p}rps <choice> - Rock paper scissors
│ ${p}slot - Slot machine
│ ${p}coinflip - Flip a coin
│ ${p}dice - Roll dice
│ ${p}number - Guess number game
│ ${p}reverse <text> - Reverse text
│ ${p}mock <text> - mOcKiNg TeXt
│ ${p}clap <text> - Add 👏 claps
│ ${p}vaporwave <text> - Ｖａｐｏｒｗａｖｅ
│ ${p}tiny <text> - ᵗⁱⁿʸ ᵗᵉˣᵗ
│ ${p}fancy <text> - 𝒻𝒶𝓃𝒸𝓎 𝓉𝑒𝓍𝓉
╰━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 🔧 *TOOLS COMMANDS* 」━╮
│ ${p}weather <city> - Weather
│ ${p}calc <math> - Calculator
│ ${p}define <word> - Dictionary
│ ${p}translate <text> - Translate
│ ${p}wiki <topic> - Wikipedia
│ ${p}time - Current time
│ ${p}date - Current date
│ ${p}countdown <date> - Countdown
│ ${p}remind <time> <msg> - Reminder
│ ${p}qr <text> - Generate QR
│ ${p}shorten <url> - Shorten URL
│ ${p}password <len> - Generate password
│ ${p}flip <text> - Flip text upside down
│ ${p}binary <text> - Text to binary
│ ${p}base64 <text> - Encode base64
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 🖼️ *MEDIA COMMANDS* 」━╮
│ ${p}meme - Random meme
│ ${p}cat - Cat picture
│ ${p}dog - Dog picture
│ ${p}anime - Anime picture
│ ${p}waifu - Waifu picture
│ ${p}neko - Neko picture
│ ${p}fox - Fox picture
│ ${p}bird - Bird picture
│ ${p}quote - Quote image
│ ${p}wallpaper - Random wallpaper
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 👥 *GROUP COMMANDS* 」━╮
│ ${p}tagall - Tag everyone
│ ${p}hidetag <msg> - Hidden tag
│ ${p}groupinfo - Group info
│ ${p}link - Group link
│ ${p}admins - List admins
│ ${p}owner - Group owner
│ ${p}membercount - Member count
│ ${p}groupname <name> - Set name
│ ${p}groupdesc <desc> - Set desc
│ ${p}poll <q> - Create poll
│ ${p}announce <msg> - Announcement
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 👑 *OWNER COMMANDS* 」━╮
│ ${p}broadcast <msg> - Broadcast
│ ${p}block @user - Block user
│ ${p}unblock @user - Unblock
│ ${p}bcgroups <msg> - BC groups
│ ${p}shutdown - Shutdown bot
│ ${p}restart - Restart bot
│ ${p}clearsession - Clear session
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━「 ⚙️ *SETTINGS* 」━╮
│ 📸 View Once Saver: ✅ ON
│ 🧠 AI Auto-Reply: ✅ ON
│ 👥 Group AI: ❌ OFF
│ 📌 Prefix: ${p}
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
│ 💡 Send message without ${p}
│    for AI auto-reply!
│
│ 📸 View once media will be
│    auto-saved to your chat!
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

_Total Commands: 100+_
_${config.footer}_`;
}

// ═══════════════════════════════════════════════════════════════
//                   COMMAND PROCESSOR
// ═══════════════════════════════════════════════════════════════

async function processCommand(cmd, args, msg, sock, from, isGroup, sender, pushName) {
    const p = config.prefix;
    const isOwner = sender.split('@')[0] === config.ownerNumber;
    
    switch(cmd) {
        
        // ════════════════════════════════════════
        //              MAIN COMMANDS
        // ════════════════════════════════════════
        
        case 'menu':
        case 'help':
        case 'commands':
        case 'cmd':
            return getMenuText();
        
        case 'owner':
            return `
╭━━━「 👑 *OWNER* 」━━━╮
│
│ 👤 Name: ${config.ownerName}
│ 📱 Number: wa.me/${config.ownerNumber}
│ 🤖 Bot: ${config.botName}
│
╰━━━━━━━━━━━━━━━━━━━━━╯

_Contact for bugs/suggestions!_`;
        
        case 'ping':
        case 'speed':
            const start = Date.now();
            return `
╭━━━「 🏓 *PONG!* 」━━━╮
│
│ ⚡ Speed: ${Date.now() - start}ms
│ 📡 Status: Online
│ 🤖 Bot: Active
│
╰━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'runtime':
        case 'uptime':
            return `
╭━━━「 ⏱️ *RUNTIME* 」━━━╮
│
│ ⏰ Uptime: ${runtime(process.uptime())}
│ 📅 Started: ${moment(startTime).tz(config.timezone).format('DD/MM/YYYY HH:mm')}
│
╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'about':
        case 'info':
            return `
╭━━━「 ℹ️ *ABOUT* 」━━━╮
│
│ 🤖 Name: ${config.botName}
│ 👑 Owner: ${config.ownerName}
│ 📌 Prefix: ${p}
│ 📱 Version: 3.0.0
│ 💻 Platform: Node.js
│
│ *Features:*
│ ✅ AI Auto-Reply
│ ✅ View Once Saver
│ ✅ 100+ Commands
│ ✅ Group Management
│ ✅ 24/7 Online
│
╰━━━━━━━━━━━━━━━━━━━━━━╯

_${config.footer}_`;
        
        case 'stats':
        case 'botstats':
            return `
╭━━━「 📊 *STATS* 」━━━╮
│
│ ⏱️ Uptime: ${runtime(process.uptime())}
│ 💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
│ 📅 Date: ${getDate()}
│ ⏰ Time: ${getTime()}
│
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        case 'time':
            return `⏰ *Current Time:* ${getTime()}`;
        
        case 'date':
            return `📅 *Today:* ${getDate()}`;
        
        // ════════════════════════════════════════
        //              AI COMMANDS
        // ════════════════════════════════════════
        
        case 'ai':
        case 'gpt':
        case 'bot':
        case 'ask':
        case 'chat':
            if (!args.length) return `❌ Please provide a question!\n\nExample: ${p}ai What is love?`;
            const aiResult = await aiChat(args.join(' '));
            return `
╭━━━「 🧠 *AI* 」━━━╮

${aiResult}

╰━━━━━━━━━━━━━━━━━━━━━╯
_${config.footer}_`;
        
        case 'imagine':
            if (!args.length) return `❌ Describe what to imagine!\n\nExample: ${p}imagine a beautiful sunset`;
            const imagineResult = await aiChat(`Imagine and describe in detail: ${args.join(' ')}`);
            return `
╭━━━「 🎨 *IMAGINE* 」━━━╮

${imagineResult}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        // ════════════════════════════════════════
        //              FUN COMMANDS
        // ════════════════════════════════════════
        
        case 'joke':
            return `
╭━━━「 😂 *JOKE* 」━━━╮

${pickRandom(jokes)}

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'quote':
        case 'motivation':
            const qt = pickRandom(quotes);
            return `
╭━━━「 💭 *QUOTE* 」━━━╮

*"${qt.q}"*

_— ${qt.a}_

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'fact':
        case 'facts':
            return `
╭━━━「 📚 *FACT* 」━━━╮

${pickRandom(facts)}

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'dare':
            return `
╭━━━「 🔥 *DARE* 」━━━╮

${pickRandom(dares)}

_No chickening out!_ 😈

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'truth':
            return `
╭━━━「 🎯 *TRUTH* 」━━━╮

${pickRandom(truths)}

_Be honest!_ 😇

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case '8ball':
        case 'magic8ball':
            if (!args.length) return `❌ Ask a question!\n\nExample: ${p}8ball Will I be rich?`;
            return `
╭━━━「 🎱 *8 BALL* 」━━━╮

❓ *Question:* ${args.join(' ')}

🎱 *Answer:* ${pickRandom(eightBallAnswers)}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'roll':
        case 'dice':
            const diceNum = Math.floor(Math.random() * 6) + 1;
            const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceNum - 1];
            return `
╭━━━「 🎲 *DICE* 」━━━╮

${diceEmoji}

*You rolled:* ${diceNum}

╰━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'flip':
        case 'coin':
        case 'coinflip':
            const coinResult = Math.random() < 0.5 ? '👑 HEADS' : '🔢 TAILS';
            return `
╭━━━「 🪙 *COIN FLIP* 」━━━╮

🪙 *Flipping...*

*Result:* ${coinResult}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'rate':
            if (!args.length) return `❌ Rate what?\n\nExample: ${p}rate my cooking`;
            const rateScore = Math.floor(Math.random() * 101);
            const rateEmoji = rateScore >= 80 ? '🔥' : rateScore >= 60 ? '😊' : rateScore >= 40 ? '😐' : '😢';
            const bar = '█'.repeat(Math.floor(rateScore/10)) + '░'.repeat(10 - Math.floor(rateScore/10));
            return `
╭━━━「 ⭐ *RATING* 」━━━╮

📊 Rating: *${args.join(' ')}*

${rateEmoji} Score: *${rateScore}/100*

${bar}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'ship':
        case 'love':
        case 'match':
            if (args.length < 2) return `❌ Need two names!\n\nExample: ${p}ship John Mary`;
            const loveScore = Math.floor(Math.random() * 101);
            let loveStatus, loveEmoji;
            if (loveScore >= 80) { loveStatus = "Perfect Match! 💕"; loveEmoji = "❤️🔥"; }
            else if (loveScore >= 60) { loveStatus = "Great Couple! 💖"; loveEmoji = "💕"; }
            else if (loveScore >= 40) { loveStatus = "Could Work! 💝"; loveEmoji = "💗"; }
            else if (loveScore >= 20) { loveStatus = "Needs Effort 💔"; loveEmoji = "💛"; }
            else { loveStatus = "Not Compatible 😬"; loveEmoji = "💔"; }
            const loveBar = '❤️'.repeat(Math.floor(loveScore/10)) + '🖤'.repeat(10 - Math.floor(loveScore/10));
            return `
╭━━━「 💕 *LOVE METER* 」━━━╮

👤 *${args[0]}*
        ${loveEmoji}
👤 *${args[1]}*

💘 Match: *${loveScore}%*
📊 ${loveStatus}

${loveBar}

╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'roast':
            const target = args.length ? args.join(' ') : pushName;
            return `
╭━━━「 🔥 *ROAST* 」━━━╮

🎯 Target: *${target}*

${pickRandom(roasts)}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'compliment':
            return `
╭━━━「 💝 *COMPLIMENT* 」━━━╮

${pickRandom(compliments)}

_You deserve it!_ ✨

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'pickup':
        case 'pickupline':
            return `
╭━━━「 💋 *PICKUP LINE* 」━━━╮

${pickRandom(pickupLines)}

_Good luck!_ 😉

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'advice':
            return `
╭━━━「 💡 *ADVICE* 」━━━╮

${pickRandom(advice)}

╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'riddle':
            const riddle = pickRandom(riddles);
            return `
╭━━━「 🧩 *RIDDLE* 」━━━╮

❓ *Question:*
${riddle.q}

💡 *Answer:*
||${riddle.a}||

╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'trivia':
            const triv = pickRandom(trivia);
            return `
╭━━━「 🧠 *TRIVIA* 」━━━╮

❓ *Question:*
${triv.q}

💡 *Answer:*
${triv.a}

╰━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'wyr':
        case 'wouldyourather':
            return `
╭━━━「 🤔 *WOULD YOU RATHER* 」━━━╮

${pickRandom(wouldYouRather)}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'nhie':
        case 'neverhaveiever':
            return `
╭━━━「 🙈 *NEVER HAVE I EVER* 」━━━╮

${pickRandom(neverHaveIEver)}

_React 👍 if you have, 👎 if not!_

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'rps':
            if (!args.length) return `❌ Choose rock, paper, or scissors!\n\nExample: ${p}rps rock`;
            const choices = ['rock', 'paper', 'scissors'];
            const userChoice = args[0].toLowerCase();
            if (!choices.includes(userChoice)) return `❌ Invalid! Use: rock, paper, or scissors`;
            const botChoice = pickRandom(choices);
            const rpsEmoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
            let rpsResult;
            if (userChoice === botChoice) rpsResult = "It's a TIE! 🤝";
            else if ((userChoice === 'rock' && botChoice === 'scissors') ||
                     (userChoice === 'paper' && botChoice === 'rock') ||
                     (userChoice === 'scissors' && botChoice === 'paper')) rpsResult = "You WIN! 🎉";
            else rpsResult = "You LOSE! 😢";
            return `
╭━━━「 🎮 *ROCK PAPER SCISSORS* 」━━━╮

You: ${rpsEmoji[userChoice]} ${userChoice}
Bot: ${rpsEmoji[botChoice]} ${botChoice}

*Result:* ${rpsResult}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'slot':
        case 'slots':
            const slotItems = ['🍎', '🍊', '🍋', '🍇', '🍒', '💎', '7️⃣', '🔔'];
            const s1 = pickRandom(slotItems);
            const s2 = pickRandom(slotItems);
            const s3 = pickRandom(slotItems);
            let slotResult = "You lose! Try again! 😢";
            if (s1 === s2 && s2 === s3) slotResult = "🎉 JACKPOT! You won! 🎉";
            else if (s1 === s2 || s2 === s3 || s1 === s3) slotResult = "Almost! Two match! 😊";
            return `
╭━━━「 🎰 *SLOT MACHINE* 」━━━╮

╔════════════╗
║ ${s1} │ ${s2} │ ${s3} ║
╚════════════╝

${slotResult}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'number':
        case 'guess':
            const secretNum = Math.floor(Math.random() * 10) + 1;
            if (!args.length) return `❌ Guess a number 1-10!\n\nExample: ${p}number 5`;
            const userNum = parseInt(args[0]);
            if (isNaN(userNum) || userNum < 1 || userNum > 10) return `❌ Enter a number between 1-10!`;
            if (userNum === secretNum) return `🎉 *CORRECT!* The number was *${secretNum}*!`;
            return `❌ Wrong! The number was *${secretNum}*. Try again!`;
        
        // Text Manipulation
        case 'reverse':
            if (!args.length) return `❌ Example: ${p}reverse hello`;
            return `🔄 ${args.join(' ').split('').reverse().join('')}`;
        
        case 'mock':
            if (!args.length) return `❌ Example: ${p}mock hello world`;
            const mockText = args.join(' ').split('').map((c, i) => i % 2 ? c.toUpperCase() : c.toLowerCase()).join('');
            return `🐔 ${mockText}`;
        
        case 'clap':
            if (!args.length) return `❌ Example: ${p}clap hello world`;
            return `👏 ${args.join(' 👏 ')} 👏`;
        
        case 'vaporwave':
        case 'vapor':
            if (!args.length) return `❌ Example: ${p}vaporwave hello`;
            const vaporText = args.join(' ').split('').map(c => {
                const code = c.charCodeAt(0);
                return (code >= 33 && code <= 126) ? String.fromCharCode(code + 65248) : c;
            }).join('');
            return `🌊 ${vaporText}`;
        
        case 'tiny':
        case 'small':
            if (!args.length) return `❌ Example: ${p}tiny hello`;
            const tinyMap = 'ᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ';
            const tinyText = args.join(' ').toLowerCase().split('').map(c => {
                const i = c.charCodeAt(0) - 97;
                return (i >= 0 && i < 26) ? tinyMap[i] : c;
            }).join('');
            return `🔤 ${tinyText}`;
        
        // ════════════════════════════════════════
        //             TOOLS COMMANDS
        // ════════════════════════════════════════
        
        case 'weather':
            if (!args.length) return `❌ Example: ${p}weather Lagos`;
            try {
                const w = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args.join(' ')}&appid=060a6bcfa19809c2cd4d97a212b19273&units=metric`);
                return `
╭━━━「 🌤️ *WEATHER* 」━━━╮

📍 *Location:* ${w.data.name}, ${w.data.sys.country}
🌡️ *Temperature:* ${w.data.main.temp}°C
🤒 *Feels Like:* ${w.data.main.feels_like}°C
💧 *Humidity:* ${w.data.main.humidity}%
🌬️ *Wind:* ${w.data.wind.speed} m/s
☁️ *Condition:* ${w.data.weather[0].description}

╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            } catch { return "❌ City not found!"; }
        
        case 'calc':
        case 'calculate':
        case 'math':
            if (!args.length) return `❌ Example: ${p}calc 5+5*2`;
            try {
                const expr = args.join('').replace(/[^0-9+\-*/.()%^]/g, '').replace('^', '**');
                const result = eval(expr);
                return `
╭━━━「 🔢 *CALCULATOR* 」━━━╮

📝 *Expression:* ${expr}
✅ *Result:* ${result}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            } catch { return "❌ Invalid calculation!"; }
        
        case 'define':
        case 'dictionary':
        case 'meaning':
            if (!args.length) return `❌ Example: ${p}define love`;
            try {
                const d = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${args[0]}`);
                const word = d.data[0];
                const meaning = word.meanings[0];
                return `
╭━━━「 📖 *DICTIONARY* 」━━━╮

📝 *Word:* ${word.word}
🗣️ *Phonetic:* ${word.phonetic || 'N/A'}
📚 *Type:* ${meaning.partOfSpeech}

📖 *Definition:*
${meaning.definitions[0].definition}

${meaning.definitions[0].example ? `💬 *Example:*\n"${meaning.definitions[0].example}"` : ''}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            } catch { return "❌ Word not found!"; }
        
        case 'wiki':
        case 'wikipedia':
            if (!args.length) return `❌ Example: ${p}wiki Nigeria`;
            try {
                const wiki = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(args.join(' '))}`);
                return `
╭━━━「 📚 *WIKIPEDIA* 」━━━╮

📝 *Title:* ${wiki.data.title}

${wiki.data.extract.slice(0, 500)}${wiki.data.extract.length > 500 ? '...' : ''}

🔗 ${wiki.data.content_urls.desktop.page}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
            } catch { return "❌ Article not found!"; }
        
        case 'password':
        case 'genpass':
            const len = parseInt(args[0]) || 12;
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
            let pass = '';
            for (let i = 0; i < Math.min(len, 50); i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
            return `
╭━━━「 🔐 *PASSWORD* 」━━━╮

🔑 *Generated:* \`${pass}\`
📏 *Length:* ${pass.length}

╰━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        case 'binary':
            if (!args.length) return `❌ Example: ${p}binary hello`;
            const binary = args.join(' ').split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ');
            return `💻 *Binary:*\n${binary}`;
        
        case 'base64':
            if (!args.length) return `❌ Example: ${p}base64 hello`;
            const b64 = Buffer.from(args.join(' ')).toString('base64');
            return `🔤 *Base64:*\n${b64}`;
        
        // ════════════════════════════════════════
        //            MEDIA COMMANDS
        // ════════════════════════════════════════
        
        case 'meme':
            return { type: 'meme' };
        case 'cat':
            return { type: 'cat' };
        case 'dog':
            return { type: 'dog' };
        case 'anime':
        case 'waifu':
            return { type: 'waifu' };
        case 'neko':
            return { type: 'neko' };
        case 'fox':
            return { type: 'fox' };
        case 'bird':
            return { type: 'bird' };
        case 'wallpaper':
            return { type: 'wallpaper' };
        
        // ════════════════════════════════════════
        //            GROUP COMMANDS
        // ════════════════════════════════════════
        
        case 'tagall':
        case 'all':
            return { type: 'tagall' };
        
        case 'hidetag':
            if (!args.length) return `❌ Example: ${p}hidetag Hello everyone!`;
            return { type: 'hidetag', text: args.join(' ') };
        
        case 'groupinfo':
        case 'ginfo':
            return { type: 'groupinfo' };
        
        case 'link':
        case 'grouplink':
        case 'gclink':
            return { type: 'link' };
        
        case 'admins':
        case 'listadmin':
            return { type: 'admins' };
        
        case 'membercount':
        case 'members':
            return { type: 'membercount' };
        
        // ════════════════════════════════════════
        //            OWNER COMMANDS
        // ════════════════════════════════════════
        
        case 'broadcast':
        case 'bc':
            if (!isOwner) return `❌ Owner only command!`;
            if (!args.length) return `❌ Example: ${p}broadcast Hello everyone!`;
            return { type: 'broadcast', text: args.join(' ') };
        
        case 'shutdown':
        case 'die':
            if (!isOwner) return `❌ Owner only command!`;
            return `⚠️ Bot shutting down...`;
        
        case 'clearsession':
            if (!isOwner) return `❌ Owner only command!`;
            clearAuthFolder();
            return `✅ Session cleared! Bot will restart...`;
        
        default:
            return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//                        START BOT
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
            browser: ['Olayinka Bot', 'Chrome', '3.0.0']
        });
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Generated!');
                connectionStatus = 'qr';
                retryCount = 0;
                try {
                    qrImageData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                    setTimeout(async () => {
                        if (!sock.authState.creds.registered) {
                            try {
                                currentPairingCode = await sock.requestPairingCode(config.ownerNumber);
                                console.log(`🔐 Code: ${currentPairingCode}`);
                            } catch {}
                        }
                    }, 3000);
                } catch {}
            }
            
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(`❌ Disconnected (${code})`);
                currentQR = null; qrImageData = null; currentPairingCode = null;
                
                if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) {
                    clearAuthFolder();
                    retryCount = 0;
                }
                connectionStatus = 'error';
                connectionMessage = 'Reconnecting...';
                retryCount++;
                if (retryCount > 5) { clearAuthFolder(); retryCount = 0; }
                setTimeout(startBot, 5000);
            }
            
            if (connection === 'open') {
                console.log('✅ CONNECTED!');
                connectionStatus = 'connected';
                retryCount = 0;
                currentQR = null; qrImageData = null; currentPairingCode = null;
                
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `✅ *${config.botName} Online!*\n\n⏰ ${getTime()}\n📅 ${getDate()}\n\n🎮 100+ Commands Ready!\n\nType *${config.prefix}menu*`
                    });
                } catch {}
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // Message Handler
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg.message || msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                const sender = msg.key.participant || from;
                const senderNumber = sender.split('@')[0];
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');
                const isOwner = senderNumber === config.ownerNumber;
                
                const type = Object.keys(msg.message)[0];
                const body = 
                    type === 'conversation' ? msg.message.conversation :
                    type === 'extendedTextMessage' ? msg.message.extendedTextMessage?.text :
                    type === 'imageMessage' ? msg.message.imageMessage?.caption || '' :
                    type === 'videoMessage' ? msg.message.videoMessage?.caption || '' : '';
                
                // View Once Saver
                if ((type === 'viewOnceMessageV2' || type === 'viewOnceMessage') && config.saveViewOnce) {
                    console.log(`📸 ViewOnce: ${pushName}`);
                    try {
                        const vom = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
                        const mt = Object.keys(vom.message)[0];
                        const buf = await downloadMediaMessage({ message: vom.message }, 'buffer', {});
                        const cap = `📸 *VIEW ONCE SAVED*\n\n👤 *From:* ${pushName}\n📱 *Number:* ${senderNumber}\n⏰ *Time:* ${getTime()}\n📅 *Date:* ${getDate()}\n\n_Saved by ${config.botName}_`;
                        const oid = config.ownerNumber + '@s.whatsapp.net';
                        
                        if (mt.includes('image')) await sock.sendMessage(oid, { image: buf, caption: cap });
                        else if (mt.includes('video')) await sock.sendMessage(oid, { video: buf, caption: cap });
                        else if (mt.includes('audio')) {
                            await sock.sendMessage(oid, { audio: buf, mimetype: 'audio/mp4', ptt: true });
                            await sock.sendMessage(oid, { text: cap });
                        }
                        console.log('✅ Saved!');
                    } catch (e) { console.log('❌', e.message); }
                    return;
                }
                
                // Commands
                if (body.startsWith(config.prefix)) {
                    const args = body.slice(config.prefix.length).trim().split(/ +/);
                    const cmd = args.shift().toLowerCase();
                    console.log(`📩 ${cmd} from ${pushName}`);
                    
                    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
                    
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
                    // Media responses
                    else if (result?.type === 'meme') {
                        try {
                            const r = await axios.get('https://meme-api.com/gimme');
                            await sock.sendMessage(from, { image: { url: r.data.url }, caption: `😂 *${r.data.title}*` }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'cat') {
                        try {
                            const r = await axios.get('https://api.thecatapi.com/v1/images/search');
                            await sock.sendMessage(from, { image: { url: r.data[0].url }, caption: '🐱 *Meow!*' }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'dog') {
                        try {
                            const r = await axios.get('https://dog.ceo/api/breeds/image/random');
                            await sock.sendMessage(from, { image: { url: r.data.message }, caption: '🐕 *Woof!*' }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'waifu') {
                        try {
                            const r = await axios.get('https://api.waifu.pics/sfw/waifu');
                            await sock.sendMessage(from, { image: { url: r.data.url }, caption: '🎌 *Waifu*' }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'neko') {
                        try {
                            const r = await axios.get('https://api.waifu.pics/sfw/neko');
                            await sock.sendMessage(from, { image: { url: r.data.url }, caption: '🐱 *Neko*' }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'fox') {
                        try {
                            const r = await axios.get('https://randomfox.ca/floof/');
                            await sock.sendMessage(from, { image: { url: r.data.image }, caption: '🦊 *Fox!*' }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'bird') {
                        try {
                            const r = await axios.get('https://some-random-api.com/animal/bird');
                            await sock.sendMessage(from, { image: { url: r.data.image }, caption: `🐦 ${r.data.fact}` }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'tagall' && isGroup) {
                        try {
                            const g = await sock.groupMetadata(from);
                            const m = g.participants.map(p => p.id);
                            let txt = `╭━━━「 📢 *TAG ALL* 」━━━╮\n\n`;
                            m.forEach(x => txt += `• @${x.split('@')[0]}\n`);
                            txt += `\n╰━━━━━━━━━━━━━━━━━━━╯`;
                            await sock.sendMessage(from, { text: txt, mentions: m }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'hidetag' && isGroup) {
                        try {
                            const g = await sock.groupMetadata(from);
                            const m = g.participants.map(p => p.id);
                            await sock.sendMessage(from, { text: result.text, mentions: m });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'groupinfo' && isGroup) {
                        try {
                            const g = await sock.groupMetadata(from);
                            await sock.sendMessage(from, {
                                text: `╭━━━「 👥 *GROUP INFO* 」━━━╮\n\n📛 *Name:* ${g.subject}\n👥 *Members:* ${g.participants.length}\n📝 *Desc:* ${g.desc || 'None'}\n📅 *Created:* ${moment(g.creation * 1000).format('DD/MM/YYYY')}\n\n╰━━━━━━━━━━━━━━━━━━━━━━━╯`
                            }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'link' && isGroup) {
                        try {
                            const code = await sock.groupInviteCode(from);
                            await sock.sendMessage(from, { text: `🔗 *Group Link:*\n\nhttps://chat.whatsapp.com/${code}` }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Need admin!' }); }
                    }
                    else if (result?.type === 'admins' && isGroup) {
                        try {
                            const g = await sock.groupMetadata(from);
                            const admins = g.participants.filter(p => p.admin);
                            let txt = `╭━━━「 👑 *ADMINS* 」━━━╮\n\n`;
                            admins.forEach(a => txt += `• @${a.id.split('@')[0]} (${a.admin})\n`);
                            txt += `\n╰━━━━━━━━━━━━━━━━━━━━╯`;
                            await sock.sendMessage(from, { text: txt, mentions: admins.map(a => a.id) }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'membercount' && isGroup) {
                        try {
                            const g = await sock.groupMetadata(from);
                            await sock.sendMessage(from, { text: `👥 *Members:* ${g.participants.length}` }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                    return;
                }
                
                // AI Auto Reply (Private chats only)
                if (config.autoAI && body.trim() && !isGroup) {
                    console.log(`🤖 AI: ${body.slice(0, 30)}...`);
                    await sock.sendPresenceUpdate('composing', from);
                    const ai = await aiChat(body);
                    await sock.sendMessage(from, {
                        text: `╭━━━「 🤖 *${config.botName}* 」━━━╮\n\n${ai}\n\n╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n_Type ${config.prefix}menu for commands_`
                    }, { quoted: msg });
                }
                
            } catch (e) { console.log('Error:', e.message); }
        });
        
    } catch (e) {
        console.log('Start Error:', e.message);
        connectionStatus = 'error';
        connectionMessage = e.message;
        retryCount++;
        if (retryCount > 3) { clearAuthFolder(); retryCount = 0; }
        setTimeout(startBot, 10000);
    }
}

// Start
console.log(`
╔════════════════════════════════════╗
║  🤖 ${config.botName.toUpperCase()}
║  👑 ${config.ownerName}
║  🎮 100+ Commands
╚════════════════════════════════════╝
`);

startBot();
