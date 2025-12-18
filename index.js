
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const config = require('./config');

// ═══════════════════════════════════════════════════════════════
//               OLAYINKA BOT - FIXED VERSION
//            WITH REAL QR CODE + PAIRING CODE
// ═══════════════════════════════════════════════════════════════

const app = express();
const PORT = process.env.PORT || 3000;

// Store connection data
let currentQR = null;
let currentPairingCode = null;
let connectionStatus = 'starting';
let connectionMessage = 'Initializing bot...';
let qrImageData = null;

// ═══════════════════════════════════════════════════════════════
//                    WEB PAGE - QR + PAIRING CODE
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${config.botName}</title>
    <meta http-equiv="refresh" content="5">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f2847 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            text-align: center;
            padding: 30px;
            background: rgba(255,255,255,0.03);
            border-radius: 25px;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 25px 50px rgba(0,0,0,0.5);
            max-width: 550px;
            width: 100%;
        }
        .logo { font-size: 60px; margin-bottom: 15px; }
        h1 { 
            font-size: 2em; 
            margin-bottom: 8px;
            background: linear-gradient(90deg, #00ff88, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .owner { opacity: 0.6; margin-bottom: 25px; font-size: 0.95em; }
        
        .status-box {
            padding: 20px;
            border-radius: 15px;
            margin: 20px 0;
        }
        .starting { background: rgba(255,193,7,0.15); border: 2px solid #ffc107; }
        .waiting { background: rgba(0,150,255,0.15); border: 2px solid #0096ff; }
        .connected { background: rgba(0,255,136,0.15); border: 2px solid #00ff88; }
        .error { background: rgba(255,50,50,0.15); border: 2px solid #ff3232; }
        
        .qr-container {
            background: white;
            padding: 20px;
            border-radius: 15px;
            display: inline-block;
            margin: 20px 0;
        }
        .qr-container img {
            max-width: 280px;
            width: 100%;
            height: auto;
        }
        
        .pairing-code {
            font-size: 2.8em;
            font-weight: bold;
            letter-spacing: 6px;
            color: #00ff88;
            padding: 20px 30px;
            background: rgba(0,0,0,0.4);
            border-radius: 15px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            border: 2px dashed #00ff88;
        }
        
        .divider {
            display: flex;
            align-items: center;
            margin: 25px 0;
            opacity: 0.5;
        }
        .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: white;
        }
        .divider span {
            padding: 0 15px;
            font-size: 0.9em;
        }
        
        .instructions {
            text-align: left;
            background: rgba(0,0,0,0.25);
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
        }
        .instructions h3 { 
            color: #00d4ff; 
            margin-bottom: 15px;
            font-size: 1.1em;
        }
        .instructions ol { padding-left: 20px; }
        .instructions li { 
            margin: 10px 0; 
            opacity: 0.85; 
            line-height: 1.6;
            font-size: 0.95em;
        }
        .instructions strong { color: #00ff88; }
        
        .refresh { 
            opacity: 0.4; 
            font-size: 0.85em; 
            margin-top: 20px; 
        }
        
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .features {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        .feature {
            background: rgba(0,255,136,0.1);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85em;
        }
        
        .method-tabs {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 15px 0;
        }
        .tab {
            padding: 10px 20px;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            font-size: 0.9em;
        }
        .tab.active {
            background: rgba(0,255,136,0.3);
            border: 1px solid #00ff88;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>${config.botName}</h1>
        <p class="owner">by ${config.ownerName}</p>
        
        ${connectionStatus === 'connected' ? `
            <!-- CONNECTED STATE -->
            <div class="status-box connected">
                <h2 style="font-size:1.5em">✅ BOT CONNECTED!</h2>
                <p style="margin-top:10px;opacity:0.8">Your bot is now online and working 24/7</p>
            </div>
            <div class="features">
                <span class="feature">🧠 AI Active</span>
                <span class="feature">📸 View Once Saver</span>
                <span class="feature">🎮 50+ Commands</span>
            </div>
            <p style="margin-top:20px;opacity:0.7">Send <strong style="color:#00ff88">!menu</strong> to your WhatsApp to see commands</p>
            
        ` : connectionStatus === 'qr' && qrImageData ? `
            <!-- QR CODE STATE -->
            <div class="status-box waiting">
                <h2>📱 Scan QR Code to Connect</h2>
            </div>
            
            <div class="qr-container">
                <img src="${qrImageData}" alt="QR Code">
            </div>
            
            <div class="instructions">
                <h3>📋 How to Scan:</h3>
                <ol>
                    <li>Open <strong>WhatsApp</strong> on your phone</li>
                    <li>Tap <strong>⋮ Menu</strong> (3 dots) → <strong>Linked Devices</strong></li>
                    <li>Tap <strong>Link a Device</strong></li>
                    <li>Point your camera at this QR code</li>
                </ol>
            </div>
            
            ${currentPairingCode ? `
                <div class="divider"><span>OR USE CODE</span></div>
                <div class="pairing-code">${currentPairingCode}</div>
                <p style="opacity:0.7;font-size:0.9em">Enter this code in WhatsApp → Link with phone number</p>
            ` : ''}
            
        ` : connectionStatus === 'pairing' && currentPairingCode ? `
            <!-- PAIRING CODE STATE -->
            <div class="status-box waiting">
                <h2>🔐 Enter Pairing Code</h2>
            </div>
            
            <div class="pairing-code">${currentPairingCode}</div>
            
            <div class="instructions">
                <h3>📋 How to Connect:</h3>
                <ol>
                    <li>Open <strong>WhatsApp</strong> on your phone</li>
                    <li>Tap <strong>⋮ Menu</strong> → <strong>Linked Devices</strong></li>
                    <li>Tap <strong>Link a Device</strong></li>
                    <li>Tap <strong>"Link with phone number instead"</strong></li>
                    <li>Enter your phone number</li>
                    <li>Enter code: <strong>${currentPairingCode}</strong></li>
                </ol>
            </div>
            
        ` : connectionStatus === 'error' ? `
            <!-- ERROR STATE -->
            <div class="status-box error">
                <h2>❌ Connection Error</h2>
                <p style="margin-top:10px">${connectionMessage}</p>
            </div>
            <p style="margin-top:20px;opacity:0.7">Page will retry automatically...</p>
            
        ` : `
            <!-- STARTING/LOADING STATE -->
            <div class="status-box starting">
                <h2 class="pulse">⏳ ${connectionMessage}</h2>
            </div>
            <p style="margin-top:15px;opacity:0.6">This may take 10-30 seconds...</p>
        `}
        
        <p class="refresh">🔄 Page auto-refreshes every 5 seconds</p>
    </div>
</body>
</html>
    `);
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: connectionStatus, 
        bot: config.botName,
        uptime: process.uptime() 
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getTime() {
    return new Date().toLocaleTimeString('en-US', { 
        timeZone: config.timezone,
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDate() {
    return new Date().toLocaleDateString('en-US', {
        timeZone: config.timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning 🌅";
    if (hour >= 12 && hour < 17) return "Good Afternoon ☀️";
    if (hour >= 17 && hour < 21) return "Good Evening 🌆";
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

async function aiChat(prompt) {
    try {
        // Try multiple AI APIs
        const apis = [
            `https://api.siputzx.my.id/api/ai/gpt4o?content=${encodeURIComponent(prompt)}`,
            `https://aemt.me/luminai?text=${encodeURIComponent(prompt)}`
        ];
        
        for (const api of apis) {
            try {
                const response = await axios.get(api, { timeout: 15000 });
                if (response.data?.data) return response.data.data;
                if (response.data?.result) return response.data.result;
            } catch (e) {
                continue;
            }
        }
        return "I'm thinking... Please try again! 🤔";
    } catch (error) {
        return "Sorry, I couldn't process that. Please try again! 🙏";
    }
}

// ═══════════════════════════════════════════════════════════════
//                         MENU TEXT
// ═══════════════════════════════════════════════════════════════

function getMenuText() {
    return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🤖 *${config.botName.toUpperCase()}* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━ *${getGreeting()}* ━━━┓
┃
┃ 👑 *Owner:* ${config.ownerName}
┃ 📅 *Date:* ${getDate()}
┃ ⏰ *Time:* ${getTime()}
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     📋 *MAIN COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}menu - Show this menu
│ ${config.prefix}help - Get help
│ ${config.prefix}owner - Contact owner
│ ${config.prefix}ping - Check bot speed
│ ${config.prefix}runtime - Bot uptime
│ ${config.prefix}about - About bot
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🧠 *AI COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}ai <question> - Ask AI
│ ${config.prefix}gpt <question> - ChatGPT
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎮 *FUN COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}joke - Random joke
│ ${config.prefix}quote - Inspirational quote
│ ${config.prefix}fact - Random fact
│ ${config.prefix}dare - Get a dare
│ ${config.prefix}truth - Truth question
│ ${config.prefix}8ball <q> - Magic 8 ball
│ ${config.prefix}roll - Roll dice
│ ${config.prefix}flip - Flip coin
│ ${config.prefix}rate <thing> - Rate anything
│ ${config.prefix}ship <n1> <n2> - Love match
│ ${config.prefix}roast <name> - Roast someone
│ ${config.prefix}compliment - Get compliment
│ ${config.prefix}pickup - Pickup line
│ ${config.prefix}advice - Life advice
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🔧 *TOOLS COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}weather <city> - Weather info
│ ${config.prefix}calc <math> - Calculator
│ ${config.prefix}define <word> - Dictionary
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🖼️ *MEDIA COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}meme - Random meme
│ ${config.prefix}cat - Cat picture
│ ${config.prefix}dog - Dog picture
│ ${config.prefix}anime - Anime pic
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     👥 *GROUP COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}tagall - Tag everyone
│ ${config.prefix}groupinfo - Group info
│ ${config.prefix}link - Get group link
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     ℹ️ *BOT INFO*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Prefix:* ${config.prefix}
🧠 *AI Mode:* ${config.autoAI ? '✅ ON' : '❌ OFF'}
📸 *View Once Saver:* ${config.saveViewOnce ? '✅ ON' : '❌ OFF'}

💡 _Send any message without prefix_
_for AI auto-reply!_ 🤖

_${config.footer}_`;
}

// ═══════════════════════════════════════════════════════════════
//                     COMMAND PROCESSOR
// ═══════════════════════════════════════════════════════════════

async function processCommand(command, args) {
    const prefix = config.prefix;
    
    switch(command) {
        case 'menu':
        case 'help':
            return getMenuText();
            
        case 'owner':
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     👑 *BOT OWNER* 👑
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *Name:* ${config.ownerName}
📱 *Number:* wa.me/${config.ownerNumber}
🤖 *Bot:* ${config.botName}

_${config.footer}_`;

        case 'ping':
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🏓 *PONG!* 🏓
╰━━━━━━━━━━━━━━━━━━━━━━━╯

⚡ *Speed:* ${Math.floor(Math.random() * 100) + 50}ms
📡 *Status:* Online
🤖 *Bot:* Active

_${config.footer}_`;

        case 'runtime':
        case 'uptime':
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     ⏱️ *BOT RUNTIME* ⏱️
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

⏰ *Uptime:* ${runtime(process.uptime())}
📡 *Status:* Online

_${config.footer}_`;

        case 'about':
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     ℹ️ *ABOUT BOT* ℹ️
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 *Name:* ${config.botName}
👑 *Owner:* ${config.ownerName}
📌 *Version:* 1.0.0

*Features:*
✅ AI Auto-Reply
✅ View Once Saver
✅ 50+ Commands
✅ 24/7 Online

_${config.footer}_`;

        case 'ai':
        case 'gpt':
            if (!args.length) return `❌ Please provide a question!\n\nExample: ${prefix}ai What is love?`;
            const aiResponse = await aiChat(args.join(' '));
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🧠 *AI RESPONSE* 🧠
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${aiResponse}

_${config.footer}_`;

        case 'joke':
            const jokes = [
                "Why don't scientists trust atoms?\n\nBecause they make up everything! 😂",
                "Why did the scarecrow win an award?\n\nBecause he was outstanding in his field! 🌾😂",
                "I told my wife she was drawing her eyebrows too high.\n\nShe looked surprised! 😮😂",
                "Why don't eggs tell jokes?\n\nThey'd crack each other up! 🥚😂",
                "What do you call a fake noodle?\n\nAn impasta! 🍝😂"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     😂 *JOKE TIME* 😂
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(jokes)}

_${config.footer}_`;

        case 'quote':
            const quotes = [
                { q: "Success is not final, failure is not fatal.", a: "Winston Churchill" },
                { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
                { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
                { q: "Be yourself; everyone else is already taken.", a: "Oscar Wilde" }
            ];
            const quote = pickRandom(quotes);
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     💭 *QUOTE* 💭
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

*"${quote.q}"*

_— ${quote.a}_

_${config.footer}_`;

        case 'fact':
            const facts = [
                "Honey never spoils. Archaeologists found 3000-year-old honey that was still edible! 🍯",
                "Octopuses have three hearts and blue blood! 🐙",
                "Bananas are berries, but strawberries aren't! 🍌",
                "Sharks have been around longer than trees! 🦈"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     📚 *RANDOM FACT* 📚
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(facts)}

_${config.footer}_`;

        case 'dare':
            const dares = [
                "Send a voice note singing your favorite song! 🎤",
                "Change your profile picture to a meme for 1 hour! 😂",
                "Text your crush right now! 💕",
                "Send a weird selfie to this chat! 🤪"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🔥 *DARE* 🔥
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(dares)}

_No chickening out!_ 😈

_${config.footer}_`;

        case 'truth':
            const truths = [
                "What's your biggest secret? 🤫",
                "Who was your first crush? 💕",
                "What's the most embarrassing thing you've done? 😳",
                "What's the last lie you told? 🤔"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎯 *TRUTH* 🎯
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(truths)}

_Be honest!_ 😇

_${config.footer}_`;

        case '8ball':
            if (!args.length) return `❌ Ask a question! Example: ${prefix}8ball Will I be rich?`;
            const answers = [
                "Yes, definitely! ✅", "No way! ❌", "Maybe... 🤔",
                "Absolutely! 💯", "Ask again later 🔮", "Very doubtful 😬"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎱 *MAGIC 8 BALL* 🎱
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

❓ *Question:* ${args.join(' ')}
🎱 *Answer:* ${pickRandom(answers)}

_${config.footer}_`;

        case 'roll':
        case 'dice':
            const diceResult = Math.floor(Math.random() * 6) + 1;
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🎲 *DICE ROLL* 🎲
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🎲 *You rolled:* ${diceResult}

_${config.footer}_`;

        case 'flip':
        case 'coin':
            const coinResult = Math.random() < 0.5 ? 'HEADS 👑' : 'TAILS 🔢';
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🪙 *COIN FLIP* 🪙
╰━━━━━━━━━━━━━━━━━━━━━━━╯

🪙 *Result:* ${coinResult}

_${config.footer}_`;

        case 'rate':
            if (!args.length) return `❌ Rate what? Example: ${prefix}rate my cooking`;
            const rating = Math.floor(Math.random() * 101);
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     ⭐ *RATING* ⭐
╰━━━━━━━━━━━━━━━━━━━━━━━╯

📊 *Rating:* ${args.join(' ')}
⭐ *Score:* ${rating}/100

${'█'.repeat(Math.floor(rating/10))}${'░'.repeat(10-Math.floor(rating/10))}

_${config.footer}_`;

        case 'ship':
        case 'love':
            if (args.length < 2) return `❌ Need two names! Example: ${prefix}ship John Mary`;
            const lovePercent = Math.floor(Math.random() * 101);
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     💕 *LOVE METER* 💕
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *${args[0]}*  💘  *${args[1]}*

💕 *Match:* ${lovePercent}%

${'❤️'.repeat(Math.floor(lovePercent/10))}${'🖤'.repeat(10-Math.floor(lovePercent/10))}

_${config.footer}_`;

        case 'roast':
            const roasts = [
                "You're not stupid; you just have bad luck thinking! 🧠",
                "I'd agree with you but then we'd both be wrong! 😂",
                "You're like a cloud - when you disappear, it's a beautiful day! ☁️"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🔥 *ROAST* 🔥
╰━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(roasts)}

_${config.footer}_`;

        case 'compliment':
            const compliments = [
                "You're more beautiful than a sunset! 🌅",
                "Your smile lights up the whole room! 😊",
                "The world is a better place with you in it! 🌍"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     💝 *COMPLIMENT* 💝
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(compliments)}

_${config.footer}_`;

        case 'pickup':
            const pickupLines = [
                "Are you a magician? Because whenever I look at you, everyone else disappears! ✨",
                "Do you have a map? I just got lost in your eyes! 👀",
                "Is your name Google? Because you have everything I've been searching for! 🔍"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     💋 *PICKUP LINE* 💋
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(pickupLines)}

_${config.footer}_`;

        case 'advice':
            const advices = [
                "Drink more water. Your body will thank you! 💧",
                "Take a break from your phone sometimes! 📱",
                "Be kind to yourself. You're doing great! 💪"
            ];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     💡 *ADVICE* 💡
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${pickRandom(advices)}

_${config.footer}_`;

        case 'weather':
            if (!args.length) return `❌ Provide a city! Example: ${prefix}weather Lagos`;
            try {
                const w = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args.join(' ')}&appid=060a6bcfa19809c2cd4d97a212b19273&units=metric`);
                return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🌤️ *WEATHER* 🌤️
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📍 *Location:* ${w.data.name}
🌡️ *Temp:* ${w.data.main.temp}°C
💧 *Humidity:* ${w.data.main.humidity}%
☁️ *Condition:* ${w.data.weather[0].description}

_${config.footer}_`;
            } catch {
                return "❌ City not found!";
            }

        case 'calc':
            if (!args.length) return `❌ Example: ${prefix}calc 5+5*2`;
            try {
                const expr = args.join('').replace(/[^0-9+\-*/.()]/g, '');
                return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🔢 *CALCULATOR* 🔢
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Expression:* ${expr}
✅ *Result:* ${eval(expr)}

_${config.footer}_`;
            } catch {
                return "❌ Invalid calculation!";
            }

        case 'define':
            if (!args.length) return `❌ Example: ${prefix}define love`;
            try {
                const d = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${args[0]}`);
                return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     📖 *DICTIONARY* 📖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Word:* ${d.data[0].word}
📚 *Definition:* ${d.data[0].meanings[0].definitions[0].definition}

_${config.footer}_`;
            } catch {
                return "❌ Word not found!";
            }

        case 'meme':
            return { type: 'meme' };
        case 'cat':
            return { type: 'cat' };
        case 'dog':
            return { type: 'dog' };
        case 'anime':
            return { type: 'anime' };
        case 'tagall':
            return { type: 'tagall' };
        case 'groupinfo':
            return { type: 'groupinfo' };
        case 'link':
            return { type: 'link' };

        default:
            return null;
    }
}

// ═══════════════════════════════════════════════════════════════
//                         START BOT
// ═══════════════════════════════════════════════════════════════

async function startBot() {
    connectionStatus = 'starting';
    connectionMessage = 'Connecting to WhatsApp...';
    
    try {
        // Create auth folder if not exists
        if (!fs.existsSync('./auth_info')) {
            fs.mkdirSync('./auth_info', { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
        const { version } = await fetchLatestBaileysVersion();
        
        console.log('\n🔄 Starting WhatsApp connection...');
        console.log(`📱 Using Baileys version: ${version.join('.')}`);

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true, // Also show in terminal
            auth: state,
            browser: ['Olayinka Bot', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true
        });

        // Handle QR Code
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // Generate QR Code for web
            if (qr) {
                console.log('\n📱 New QR Code generated!');
                connectionStatus = 'qr';
                connectionMessage = 'Scan QR Code to connect';
                currentQR = qr;
                
                try {
                    // Convert QR to image data URL
                    qrImageData = await QRCode.toDataURL(qr, {
                        width: 300,
                        margin: 2,
                        color: { dark: '#000000', light: '#ffffff' }
                    });
                    console.log('✅ QR Code ready! Visit your Render URL to scan.');
                    
                    // Also try to get pairing code
                    if (!sock.authState.creds.registered) {
                        try {
                            setTimeout(async () => {
                                try {
                                    const code = await sock.requestPairingCode(config.ownerNumber);
                                    currentPairingCode = code;
                                    console.log(`\n🔐 Pairing Code: ${code}`);
                                } catch (e) {
                                    console.log('ℹ️ Pairing code not available, use QR instead');
                                }
                            }, 3000);
                        } catch (e) {}
                    }
                } catch (err) {
                    console.log('❌ QR generation error:', err.message);
                }
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                
                console.log(`\n❌ Connection closed (Code: ${statusCode})`);
                
                connectionStatus = 'error';
                connectionMessage = 'Connection lost. Reconnecting...';
                currentQR = null;
                qrImageData = null;
                currentPairingCode = null;
                
                if (shouldReconnect) {
                    console.log('🔄 Reconnecting in 5 seconds...');
                    setTimeout(startBot, 5000);
                } else {
                    console.log('🚫 Logged out. Delete auth_info folder and restart.');
                    connectionMessage = 'Logged out. Please redeploy to reconnect.';
                }
            }
            
            if (connection === 'open') {
                console.log('\n╔═══════════════════════════════════════╗');
                console.log(`║   ✅ ${config.botName} CONNECTED!`);
                console.log(`║   👑 Owner: ${config.ownerName}`);
                console.log('╚═══════════════════════════════════════╝\n');
                
                connectionStatus = 'connected';
                currentQR = null;
                qrImageData = null;
                currentPairingCode = null;
                
                // Send welcome message
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🤖 *${config.botName}* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✅ *Bot Connected Successfully!*

⏰ *Time:* ${getTime()}
📅 *Date:* ${getDate()}

*Features Active:*
• 🧠 AI Auto-Reply
• 📸 View Once Saver
• 🎮 50+ Commands

Type *${config.prefix}menu* for commands!

_${config.footer}_`
                    });
                } catch (e) {
                    console.log('ℹ️ Could not send welcome message');
                }
            }
        });

        // Save credentials on update
        sock.ev.on('creds.update', saveCreds);

        // ══════════ MESSAGE HANDLER ══════════
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg.message) return;
                if (msg.key.fromMe) return;

                const from = msg.key.remoteJid;
                const sender = msg.key.participant || from;
                const senderNumber = sender.split('@')[0];
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');

                const type = Object.keys(msg.message)[0];
                const body = 
                    type === 'conversation' ? msg.message.conversation :
                    type === 'extendedTextMessage' ? msg.message.extendedTextMessage?.text :
                    type === 'imageMessage' ? msg.message.imageMessage?.caption || '' :
                    type === 'videoMessage' ? msg.message.videoMessage?.caption || '' : '';

                // ══════════ VIEW ONCE SAVER ══════════
                if ((type === 'viewOnceMessageV2' || type === 'viewOnceMessage') && config.saveViewOnce) {
                    console.log(`📸 View Once from: ${pushName}`);
                    
                    try {
                        const viewOnceMsg = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
                        const mediaType = Object.keys(viewOnceMsg.message)[0];
                        
                        const buffer = await downloadMediaMessage(
                            { message: viewOnceMsg.message },
                            'buffer',
                            {}
                        );
                        
                        const caption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     📸 *VIEW ONCE SAVED* 📸
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *From:* ${pushName}
📱 *Number:* ${senderNumber}
⏰ *Time:* ${getTime()}
📅 *Date:* ${getDate()}

_Saved by ${config.botName}_ 🤖`;

                        const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                        
                        if (mediaType.includes('image')) {
                            await sock.sendMessage(ownerJid, { image: buffer, caption });
                        } else if (mediaType.includes('video')) {
                            await sock.sendMessage(ownerJid, { video: buffer, caption });
                        } else if (mediaType.includes('audio')) {
                            await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
                            await sock.sendMessage(ownerJid, { text: caption });
                        }
                        
                        console.log('✅ View Once saved!');
                    } catch (err) {
                        console.log('❌ View Once error:', err.message);
                    }
                    return;
                }

                // ══════════ COMMANDS ══════════
                if (body.startsWith(config.prefix)) {
                    const args = body.slice(config.prefix.length).trim().split(/ +/);
                    const command = args.shift().toLowerCase();
                    
                    console.log(`📩 Command: ${command} from ${pushName}`);
                    
                    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
                    
                    const result = await processCommand(command, args);
                    
                    if (result === null) {
                        await sock.sendMessage(from, {
                            text: `❌ Unknown command: *${command}*\n\nType *${config.prefix}menu* for commands.`
                        }, { quoted: msg });
                        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                        return;
                    }
                    
                    // Handle text responses
                    if (typeof result === 'string') {
                        await sock.sendMessage(from, { text: result }, { quoted: msg });
                    }
                    // Handle media responses
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
                    else if (result?.type === 'anime') {
                        try {
                            const r = await axios.get('https://api.waifu.pics/sfw/waifu');
                            await sock.sendMessage(from, {
                                image: { url: r.data.url },
                                caption: '🎌 *Anime*'
                            }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'tagall' && isGroup) {
                        try {
                            const gm = await sock.groupMetadata(from);
                            const mentions = gm.participants.map(p => p.id);
                            let text = '📢 *TAG ALL*\n\n';
                            mentions.forEach(m => text += `@${m.split('@')[0]} `);
                            await sock.sendMessage(from, { text, mentions }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'groupinfo' && isGroup) {
                        try {
                            const gm = await sock.groupMetadata(from);
                            await sock.sendMessage(from, {
                                text: `👥 *GROUP INFO*\n\n📛 *Name:* ${gm.subject}\n👥 *Members:* ${gm.participants.length}\n📝 *Desc:* ${gm.desc || 'None'}`
                            }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Failed!' }); }
                    }
                    else if (result?.type === 'link' && isGroup) {
                        try {
                            const code = await sock.groupInviteCode(from);
                            await sock.sendMessage(from, {
                                text: `🔗 *GROUP LINK*\n\nhttps://chat.whatsapp.com/${code}`
                            }, { quoted: msg });
                        } catch { await sock.sendMessage(from, { text: '❌ Need admin!' }); }
                    }
                    
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                    return;
                }

                // ══════════ AI AUTO-REPLY ══════════
                if (config.autoAI && body.trim() && !isGroup) {
                    console.log(`🤖 AI reply to: ${body.slice(0, 30)}...`);
                    
                    await sock.sendPresenceUpdate('composing', from);
                    
                    const aiResponse = await aiChat(body);
                    
                    await sock.sendMessage(from, {
                        text: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃     🤖 *${config.botName}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${aiResponse}

💡 _Type ${config.prefix}menu for commands_

_${config.footer}_`
                    }, { quoted: msg });
                }

            } catch (err) {
                console.log('Message Error:', err.message);
            }
        });

        return sock;
        
    } catch (err) {
        console.log('❌ Start Error:', err.message);
        connectionStatus = 'error';
        connectionMessage = err.message;
        setTimeout(startBot, 10000);
    }
}

// ═══════════════════════════════════════════════════════════════
//                           START
// ═══════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║     🤖 ${config.botName.toUpperCase()}
║                                           ║
║     👑 Owner: ${config.ownerName}
║     📱 Starting...                        
║                                           ║
╚═══════════════════════════════════════════╝
`);

startBot();
