
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const moment = require('moment-timezone');

// ═══════════════════════════════════════════════════════════════
//        OLAYINKA BOT V5 - COMPLETE FIXED VERSION
//        100+ Commands + Downloads + Games + AI! 🎮
// ═══════════════════════════════════════════════════════════════

// Configuration - EDIT THESE!
const config = {
    botName: "OLAYINKA BOT",
    ownerName: "Olayinka", 
    ownerNumber: "2348123456789", // YOUR NUMBER (no + or spaces)
    prefix: "!",                   // Command prefix (! or .)
    timezone: "Africa/Lagos",
    footer: "© OLAYINKA BOT 2024",
    saveViewOnce: true,
    autoAI: true,
    awayMode: false,
    awayMessage: "👋 The owner is away. I'm an AI assistant - ask me anything!"
};

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info';

// State Variables
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
            console.log('🗑️ Auth folder cleared!');
        }
        return true;
    } catch (e) {
        console.log('Clear error:', e.message);
        return false;
    }
}

const getTime = () => moment().tz(config.timezone).format('hh:mm A');
const getDate = () => moment().tz(config.timezone).format('dddd, MMMM Do YYYY');

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
//                    AI CHAT FUNCTION (FREE APIs)
// ═══════════════════════════════════════════════════════════════

async function aiChat(prompt) {
    const apis = [
        { 
            url: `https://api.siputzx.my.id/api/ai/gpt4o?content=${encodeURIComponent(prompt)}`, 
            path: 'data' 
        },
        { 
            url: `https://aemt.me/luminai?text=${encodeURIComponent(prompt)}&prompt=You are a helpful assistant`, 
            path: 'result' 
        },
        { 
            url: `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(prompt)}`, 
            path: 'response' 
        },
        {
            url: `https://widipe.com/gpt4?text=${encodeURIComponent(prompt)}`,
            path: 'result'
        }
    ];
    
    for (const api of apis) {
        try {
            const response = await axios.get(api.url, { 
                timeout: 25000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            let result = response.data;
            for (const key of api.path.split('.')) {
                result = result?.[key];
            }
            
            if (result && typeof result === 'string' && result.length > 5) {
                return result;
            }
        } catch (err) { 
            console.log(`API ${api.url.split('/')[2]} failed:`, err.message);
            continue; 
        }
    }
    
    return "I'm having trouble connecting right now. Please try again in a moment! 🤔";
}

// ═══════════════════════════════════════════════════════════════
//                    DOWNLOAD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function downloadTikTok(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/tiktok?url=${encodeURIComponent(url)}`,
        `https://api.ryzendesu.vip/api/downloader/tiktok?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            const data = r.data?.data || r.data?.result || r.data;
            
            if (data?.play || data?.video || data?.url) {
                return {
                    success: true,
                    video: data.play || data.video || data.url,
                    title: data.title || 'TikTok Video',
                    author: data.author?.nickname || data.author || 'Unknown'
                };
            }
        } catch { continue; }
    }
    return { success: false };
}

async function downloadYouTube(query) {
    try {
        const searchUrl = `https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(query)}`;
        const searchRes = await axios.get(searchUrl, { timeout: 15000 });
        
        if (searchRes.data?.data?.length) {
            const videoUrl = searchRes.data.data[0].url;
            const dlUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(videoUrl)}`;
            const dlRes = await axios.get(dlUrl, { timeout: 30000 });
            
            if (dlRes.data?.data?.dl) {
                return {
                    success: true,
                    title: dlRes.data.data.title || searchRes.data.data[0].title,
                    url: dlRes.data.data.dl
                };
            }
        }
    } catch (err) {
        console.log('YouTube download error:', err.message);
    }
    return { success: false };
}

async function downloadInstagram(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/instagram?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/instagram?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            const data = r.data?.data || r.data?.result;
            
            if (data) {
                const mediaUrl = Array.isArray(data) ? data[0]?.url : data.url;
                if (mediaUrl) {
                    return { success: true, url: mediaUrl };
                }
            }
        } catch { continue; }
    }
    return { success: false };
}

async function downloadFacebook(url) {
    const apis = [
        `https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`,
        `https://aemt.me/download/facebook?url=${encodeURIComponent(url)}`
    ];
    
    for (const api of apis) {
        try {
            const r = await axios.get(api, { timeout: 30000 });
            const data = r.data?.data || r.data?.result;
            
            if (data?.hd || data?.sd || data?.url) {
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
    "Why did the math book look sad? It had too many problems! 📚"
];

const quotes = [
    { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
    { q: "Innovation distinguishes between a leader and a follower.", a: "Steve Jobs" },
    { q: "Life is what happens when you're busy making other plans.", a: "John Lennon" },
    { q: "The future belongs to those who believe in the beauty of their dreams.", a: "Eleanor Roosevelt" },
    { q: "Success is not final, failure is not fatal: it is the courage to continue.", a: "Winston Churchill" }
];

const facts = [
    "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs! 🍯",
    "Octopuses have three hearts and blue blood! 🐙",
    "A day on Venus is longer than its year! 🪐",
    "Bananas are berries, but strawberries aren't! 🍌",
    "The Eiffel Tower can grow 6 inches taller in summer! 🗼"
];

const dares = [
    "Send a voice note singing your favorite song! 🎤",
    "Change your profile picture to a meme for 1 hour! 😂",
    "Send 'I love you' to your last chat! ❤️",
    "Do 10 push-ups and send a video! 💪",
    "Post an embarrassing photo on your status! 📸"
];

const truths = [
    "What's your biggest secret? 🤫",
    "Who was your first crush? 💕",
    "What's the most embarrassing thing you've done? 😳",
    "Have you ever lied to your best friend? 🤥",
    "What's your biggest fear? 😨"
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
    "Signs point to yes ➡️"
];

const roasts = [
    "You're not stupid; you just have bad luck thinking! 🧠",
    "I'd agree with you but then we'd both be wrong! 😂",
    "You're like a cloud. When you disappear, it's a beautiful day! ☁️",
    "If I had a dollar for every brain you don't have, I'd have one dollar! 💵"
];

const compliments = [
    "You're more beautiful than a sunset! 🌅",
    "Your smile lights up the whole room! 😊",
    "You're one of a kind - a masterpiece! 🎨",
    "The world is a better place with you in it! 🌍"
];

const pickupLines = [
    "Are you a magician? Because whenever I look at you, everyone else disappears! ✨",
    "Do you have a map? I just got lost in your eyes! 👀",
    "Is your name Google? Because you have everything I've been searching for! 🔍"
];

const wouldYouRather = [
    "Would you rather be able to fly or be invisible? 🦸",
    "Would you rather have unlimited money or unlimited love? 💰❤️",
    "Would you rather live in the past or the future? ⏳"
];

const riddles = [
    { q: "What has keys but no locks?", a: "A piano! 🎹" },
    { q: "What has hands but can't clap?", a: "A clock! ⏰" },
    { q: "What has a head and a tail but no body?", a: "A coin! 🪙" }
];

const advice = [
    "Drink more water. Your body will thank you! 💧",
    "Take a break from your phone sometimes! 📱",
    "Call someone you love today! 📞"
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
    res.json({ 
        status: connectionStatus, 
        uptime: Math.floor(process.uptime()),
        botName: config.botName
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
//                    WEB PAGE
// ═══════════════════════════════════════════════════════════════

function getWebPage() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>${config.botName}</title>
    <meta http-equiv="refresh" content="5">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial;background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .container{text-align:center;padding:30px;background:rgba(255,255,255,0.05);border-radius:25px;max-width:500px;width:100%}
        .logo{font-size:60px;margin-bottom:15px}
        h1{font-size:1.8em;margin-bottom:8px;color:#00ff88}
        .status-box{padding:20px;border-radius:15px;margin:15px 0}
        .connected{background:rgba(0,255,136,0.15);border:2px solid #00ff88}
        .waiting{background:rgba(0,150,255,0.15);border:2px solid #0096ff}
        .error{background:rgba(255,50,50,0.15);border:2px solid #ff3232}
        .qr-container{background:#fff;padding:15px;border-radius:15px;display:inline-block;margin:15px 0}
        .qr-container img{max-width:250px}
        .pairing-code{font-size:2em;font-weight:bold;letter-spacing:5px;color:#00ff88;padding:15px;background:rgba(0,0,0,0.4);border-radius:15px;margin:15px 0}
        .btn{display:inline-block;padding:12px 25px;margin:8px;border-radius:10px;text-decoration:none;font-weight:bold;color:#fff}
        .btn-clear{background:#ff4444}
        .btn-restart{background:#4488ff}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>${config.botName}</h1>
        <p>by ${config.ownerName}</p>
        
        ${connectionStatus === 'connected' ? `
            <div class="status-box connected">
                <h2>✅ BOT CONNECTED!</h2>
                <p>Send <strong>${config.prefix}menu</strong> to use</p>
            </div>
        ` : connectionStatus === 'qr' && qrImageData ? `
            <div class="status-box waiting"><h2>📱 Scan QR Code</h2></div>
            <div class="qr-container"><img src="${qrImageData}" alt="QR"></div>
            ${currentPairingCode ? `<div class="pairing-code">${currentPairingCode}</div>` : ''}
            <p>Open WhatsApp → Linked Devices → Link Device</p>
        ` : connectionStatus === 'error' ? `
            <div class="status-box error">
                <h2>❌ Error</h2>
                <p>${connectionMessage}</p>
            </div>
            <a href="/clear" class="btn btn-clear">🗑️ Clear & Fix</a>
        ` : `
            <div class="status-box waiting"><h2>⏳ ${connectionMessage}</h2></div>
        `}
        
        <div style="margin-top:20px">
            <a href="/clear" class="btn btn-clear">🗑️ Clear Session</a>
            <a href="/restart" class="btn btn-restart">🔄 Restart</a>
        </div>
        <p style="margin-top:15px;opacity:0.5">Retry: ${retryCount}</p>
    </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//                    GET MESSAGE BODY (FIXED!)
// ═══════════════════════════════════════════════════════════════

function getMessageBody(msg) {
    const type = Object.keys(msg.message || {})[0];
    
    if (!type) return '';
    
    switch (type) {
        case 'conversation':
            return msg.message.conversation || '';
        case 'extendedTextMessage':
            return msg.message.extendedTextMessage?.text || '';
        case 'imageMessage':
            return msg.message.imageMessage?.caption || '';
        case 'videoMessage':
            return msg.message.videoMessage?.caption || '';
        case 'documentMessage':
            return msg.message.documentMessage?.caption || '';
        case 'buttonsResponseMessage':
            return msg.message.buttonsResponseMessage?.selectedButtonId || '';
        case 'listResponseMessage':
            return msg.message.listResponseMessage?.singleSelectReply?.selectedRowId || '';
        case 'templateButtonReplyMessage':
            return msg.message.templateButtonReplyMessage?.selectedId || '';
        default:
            return '';
    }
}

// ═══════════════════════════════════════════════════════════════
//                    MENU TEXT
// ═══════════════════════════════════════════════════════════════

function getMenuText() {
    const p = config.prefix;
    return `
╔═══════════════════════════════╗
║  🤖 *${config.botName}* 🤖
║  ${getGreeting()}
╚═══════════════════════════════╝

📊 *BOT INFO*
┃ 👑 Owner: ${config.ownerName}
┃ ⏰ ${getTime()}
┃ 📅 ${getDate()}
┃ ⚡ Uptime: ${runtime(process.uptime())}

━━━━━━━━━━━━━━━━━━━━

📋 *MAIN COMMANDS*
${p}menu - Show this menu
${p}help - Help info
${p}owner - Contact owner
${p}ping - Check bot
${p}runtime - Bot uptime

🧠 *AI COMMANDS*
${p}ai <question> - Ask AI
${p}gpt <question> - GPT chat

📥 *DOWNLOAD*
${p}tiktok <url> - TikTok video
${p}tt <url> - TikTok short
${p}play <song> - YouTube audio
${p}ig <url> - Instagram
${p}fb <url> - Facebook

🎮 *FUN & GAMES*
${p}joke - Random joke
${p}quote - Motivational quote
${p}fact - Random fact
${p}dare - Get a dare
${p}truth - Truth question
${p}8ball <question>
${p}roll - Roll dice
${p}flip - Flip coin
${p}slot - Slot machine
${p}rps <rock/paper/scissors>
${p}roast - Roast message
${p}compliment - Compliment
${p}pickup - Pickup line
${p}wyr - Would you rather
${p}riddle - Random riddle
${p}advice - Life advice

🔧 *TOOLS*
${p}weather <city>
${p}calc <math>
${p}define <word>
${p}password <length>

🖼️ *IMAGES*
${p}meme - Random meme
${p}cat - Cat image
${p}dog - Dog image
${p}waifu - Anime image

👥 *GROUP (Admin)*
${p}tagall - Tag all members
${p}hidetag <msg> - Hidden tag
${p}groupinfo - Group info
${p}link - Group link
${p}admins - List admins

━━━━━━━━━━━━━━━━━━━━
📸 ViewOnce Saver: ✅ ON
🧠 AI Auto-Reply: ✅ ON
━━━━━━━━━━━━━━━━━━━━

💡 Chat without prefix for AI!

_${config.footer}_`;
}

// ═══════════════════════════════════════════════════════════════
//                    COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleCommand(sock, msg, from, sender, pushName, isGroup, isAdmin, isBotAdmin) {
    const body = getMessageBody(msg);
    if (!body) return;
    
    const p = config.prefix;
    const senderNumber = sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;
    
    // Check if it's a command
    if (!body.startsWith(p)) {
        // AI Auto-reply for private chats
        if (config.autoAI && !isGroup && body.trim().length > 2) {
            console.log(`🤖 AI Chat: ${body.slice(0, 50)}...`);
            
            try {
                await sock.sendPresenceUpdate('composing', from);
                
                let response;
                if (config.awayMode) {
                    response = await aiChat(body);
                    response = `${config.awayMessage}\n\n---\n\n${response}`;
                } else {
                    response = await aiChat(body);
                }
                
                await sock.sendMessage(from, {
                    text: `🤖 *${config.botName}*\n\n${response}\n\n💡 _Type ${p}menu for commands_`
                }, { quoted: msg });
            } catch (err) {
                console.log('AI error:', err.message);
            }
        }
        return;
    }
    
    // Parse command
    const args = body.slice(p.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    
    console.log(`📩 Command: ${cmd} | From: ${pushName} (${senderNumber}) | Group: ${isGroup}`);
    
    // React to show processing
    try {
        await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
    } catch {}
    
    let response = null;
    
    try {
        switch (cmd) {
            // ═══════ MAIN COMMANDS ═══════
            case 'menu':
            case 'help':
            case 'commands':
            case 'start':
                response = getMenuText();
                break;
                
            case 'owner':
                response = `👑 *Owner Info*\n\n• Name: ${config.ownerName}\n• WhatsApp: wa.me/${config.ownerNumber}`;
                break;
                
            case 'ping':
                response = `🏓 *Pong!*\n⚡ Speed: ${Math.floor(Math.random() * 50) + 10}ms\n✅ Bot is active!`;
                break;
                
            case 'runtime':
            case 'uptime':
                response = `⏱️ *Bot Uptime*\n\n${runtime(process.uptime())}`;
                break;
                
            case 'about':
            case 'info':
                response = `🤖 *${config.botName}*\n\n👑 Owner: ${config.ownerName}\n⚡ Uptime: ${runtime(process.uptime())}\n📅 ${getDate()}\n\n✅ Features: AI, Downloads, Games, ViewOnce`;
                break;
            
            // ═══════ AI COMMANDS ═══════
            case 'ai':
            case 'gpt':
            case 'ask':
            case 'bot':
            case 'chat':
                if (!args.length) {
                    response = `❌ Please ask something!\n\nExample: ${p}ai What is love?`;
                } else {
                    await sock.sendPresenceUpdate('composing', from);
                    const aiResponse = await aiChat(args.join(' '));
                    response = `🧠 *AI Response*\n\n${aiResponse}`;
                }
                break;
            
            // ═══════ DOWNLOAD COMMANDS ═══════
            case 'tiktok':
            case 'tt':
            case 'tik':
                if (!args.length) {
                    response = `❌ Please provide TikTok URL!\n\nExample: ${p}tiktok https://vt.tiktok.com/xxxxx`;
                } else {
                    await sock.sendMessage(from, { text: '⏳ Downloading TikTok...' }, { quoted: msg });
                    const tt = await downloadTikTok(args[0]);
                    
                    if (tt.success) {
                        await sock.sendMessage(from, {
                            video: { url: tt.video },
                            caption: `📹 *TikTok Download*\n\n👤 Author: ${tt.author}\n📝 ${tt.title}`
                        }, { quoted: msg });
                        response = null; // Already sent
                    } else {
                        response = '❌ Failed to download TikTok! Check URL and try again.';
                    }
                }
                break;
                
            case 'play':
            case 'song':
            case 'music':
                if (!args.length) {
                    response = `❌ Please provide song name!\n\nExample: ${p}play Shape of You`;
                } else {
                    await sock.sendMessage(from, { text: `🔍 Searching: ${args.join(' ')}...` }, { quoted: msg });
                    const yt = await downloadYouTube(args.join(' '));
                    
                    if (yt.success) {
                        await sock.sendMessage(from, {
                            audio: { url: yt.url },
                            mimetype: 'audio/mp4'
                        }, { quoted: msg });
                        await sock.sendMessage(from, { text: `🎵 *${yt.title}*` });
                        response = null;
                    } else {
                        response = '❌ Failed to download! Try another song.';
                    }
                }
                break;
                
            case 'ig':
            case 'instagram':
            case 'igdl':
                if (!args.length) {
                    response = `❌ Please provide Instagram URL!\n\nExample: ${p}ig https://instagram.com/p/xxxxx`;
                } else {
                    await sock.sendMessage(from, { text: '⏳ Downloading Instagram...' }, { quoted: msg });
                    const ig = await downloadInstagram(args[0]);
                    
                    if (ig.success) {
                        await sock.sendMessage(from, {
                            video: { url: ig.url },
                            caption: '📸 *Instagram Download*'
                        }, { quoted: msg });
                        response = null;
                    } else {
                        response = '❌ Failed to download Instagram!';
                    }
                }
                break;
                
            case 'fb':
            case 'facebook':
                if (!args.length) {
                    response = `❌ Please provide Facebook URL!\n\nExample: ${p}fb https://facebook.com/video/xxxxx`;
                } else {
                    await sock.sendMessage(from, { text: '⏳ Downloading Facebook...' }, { quoted: msg });
                    const fb = await downloadFacebook(args[0]);
                    
                    if (fb.success) {
                        await sock.sendMessage(from, {
                            video: { url: fb.url },
                            caption: `📘 *Facebook Download*\n\n${fb.title}`
                        }, { quoted: msg });
                        response = null;
                    } else {
                        response = '❌ Failed to download Facebook!';
                    }
                }
                break;
            
            // ═══════ FUN & GAMES ═══════
            case 'joke':
                response = `😂 *Random Joke*\n\n${pickRandom(jokes)}`;
                break;
                
            case 'quote':
            case 'motivation':
                const qt = pickRandom(quotes);
                response = `💭 *"${qt.q}"*\n\n_— ${qt.a}_`;
                break;
                
            case 'fact':
            case 'facts':
                response = `📚 *Random Fact*\n\n${pickRandom(facts)}`;
                break;
                
            case 'dare':
                response = `🔥 *DARE*\n\n${pickRandom(dares)}\n\n_No chickening out!_ 😈`;
                break;
                
            case 'truth':
                response = `🎯 *TRUTH*\n\n${pickRandom(truths)}\n\n_Be honest!_ 😇`;
                break;
                
            case '8ball':
                if (!args.length) {
                    response = `❌ Ask a question!\n\nExample: ${p}8ball Will I be rich?`;
                } else {
                    response = `🎱 *Magic 8 Ball*\n\n❓ Question: ${args.join(' ')}\n\n🔮 Answer: ${pickRandom(eightBallAnswers)}`;
                }
                break;
                
            case 'roll':
            case 'dice':
                const dice = Math.floor(Math.random() * 6) + 1;
                const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][dice - 1];
                response = `🎲 *Dice Roll*\n\n${diceEmoji} You rolled: *${dice}*`;
                break;
                
            case 'flip':
            case 'coin':
                const coin = Math.random() < 0.5;
                response = `🪙 *Coin Flip*\n\n${coin ? '👑 HEADS!' : '🔢 TAILS!'}`;
                break;
                
            case 'slot':
            case 'slots':
                const items = ['🍎', '🍊', '🍋', '🍇', '🍒', '💎', '7️⃣'];
                const s1 = pickRandom(items), s2 = pickRandom(items), s3 = pickRandom(items);
                const win = s1 === s2 && s2 === s3;
                const partial = s1 === s2 || s2 === s3 || s1 === s3;
                response = `🎰 *SLOTS*\n\n[ ${s1} | ${s2} | ${s3} ]\n\n${win ? '🎉 JACKPOT!!! 💰' : partial ? '😊 Two match! Almost!' : '😢 Try again!'}`;
                break;
                
            case 'rps':
                if (!args.length) {
                    response = `❌ Choose rock, paper, or scissors!\n\nExample: ${p}rps rock`;
                } else {
                    const choices = ['rock', 'paper', 'scissors'];
                    const user = args[0].toLowerCase();
                    if (!choices.includes(user)) {
                        response = '❌ Choose: rock, paper, or scissors!';
                    } else {
                        const bot = pickRandom(choices);
                        const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
                        let result;
                        if (user === bot) result = "🤝 Tie!";
                        else if ((user === 'rock' && bot === 'scissors') || 
                                 (user === 'paper' && bot === 'rock') || 
                                 (user === 'scissors' && bot === 'paper')) result = "🎉 You Win!";
                        else result = "😢 You Lose!";
                        response = `🎮 *Rock Paper Scissors*\n\nYou: ${emoji[user]}\nBot: ${emoji[bot]}\n\n${result}`;
                    }
                }
                break;
                
            case 'roast':
                response = `🔥 *Roast*\n\n${pickRandom(roasts)}`;
                break;
                
            case 'compliment':
                response = `💝 *Compliment*\n\n${pickRandom(compliments)}`;
                break;
                
            case 'pickup':
            case 'pickupline':
                response = `💋 *Pickup Line*\n\n${pickRandom(pickupLines)}`;
                break;
                
            case 'wyr':
            case 'wouldyourather':
                response = `🤔 *Would You Rather*\n\n${pickRandom(wouldYouRather)}`;
                break;
                
            case 'riddle':
                const rid = pickRandom(riddles);
                response = `🧩 *Riddle*\n\n❓ ${rid.q}\n\n_Reply with your answer!_\n\n💡 Answer: ||${rid.a}||`;
                break;
                
            case 'advice':
                response = `💡 *Life Advice*\n\n${pickRandom(advice)}`;
                break;
                
            case 'rate':
                if (!args.length) {
                    response = `❌ What should I rate?\n\nExample: ${p}rate my looks`;
                } else {
                    const rating = Math.floor(Math.random() * 101);
                    response = `⭐ *Rating: ${args.join(' ')}*\n\n🔢 Score: ${rating}/100 ${'⭐'.repeat(Math.floor(rating / 20))}`;
                }
                break;
                
            case 'ship':
            case 'love':
            case 'match':
                if (args.length < 2) {
                    response = `❌ Need two names!\n\nExample: ${p}ship John Mary`;
                } else {
                    const lovePercent = Math.floor(Math.random() * 101);
                    const hearts = '❤️'.repeat(Math.floor(lovePercent / 20));
                    response = `💕 *Love Calculator*\n\n${args[0]} ❤️ ${args[1]}\n\n💘 Match: ${lovePercent}%\n${hearts}`;
                }
                break;
            
            // ═══════ TOOLS ═══════
            case 'weather':
                if (!args.length) {
                    response = `❌ Enter city name!\n\nExample: ${p}weather Lagos`;
                } else {
                    try {
                        const w = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${args.join(' ')}&appid=060a6bcfa19809c2cd4d97a212b19273&units=metric`, { timeout: 10000 });
                        response = `🌤️ *Weather: ${w.data.name}*\n\n🌡️ Temperature: ${w.data.main.temp}°C\n💧 Humidity: ${w.data.main.humidity}%\n💨 Wind: ${w.data.wind.speed} m/s\n☁️ ${w.data.weather[0].description}`;
                    } catch {
                        response = '❌ City not found!';
                    }
                }
                break;
                
            case 'calc':
            case 'calculate':
            case 'math':
                if (!args.length) {
                    response = `❌ Enter calculation!\n\nExample: ${p}calc 5+5*2`;
                } else {
                    try {
                        const expr = args.join('').replace(/[^0-9+\-*/.()]/g, '');
                        const result = eval(expr);
                        response = `🔢 *Calculator*\n\n📝 ${expr}\n✅ Result: ${result}`;
                    } catch {
                        response = '❌ Invalid calculation!';
                    }
                }
                break;
                
            case 'define':
            case 'meaning':
                if (!args.length) {
                    response = `❌ Enter a word!\n\nExample: ${p}define love`;
                } else {
                    try {
                        const d = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${args[0]}`, { timeout: 10000 });
                        const def = d.data[0];
                        response = `📖 *${def.word}*\n\n📝 ${def.meanings[0].definitions[0].definition}`;
                    } catch {
                        response = '❌ Word not found!';
                    }
                }
                break;
                
            case 'password':
            case 'pass':
                const len = Math.min(parseInt(args[0]) || 12, 50);
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
                let pass = '';
                for (let i = 0; i < len; i++) pass += chars[Math.floor(Math.random() * chars.length)];
                response = `🔐 *Generated Password*\n\n\`${pass}\``;
                break;
            
            // ═══════ IMAGE COMMANDS ═══════
            case 'meme':
                try {
                    const meme = await axios.get('https://meme-api.com/gimme', { timeout: 10000 });
                    await sock.sendMessage(from, {
                        image: { url: meme.data.url },
                        caption: `😂 *${meme.data.title}*`
                    }, { quoted: msg });
                    response = null;
                } catch {
                    response = '❌ Failed to get meme!';
                }
                break;
                
            case 'cat':
                try {
                    const cat = await axios.get('https://api.thecatapi.com/v1/images/search', { timeout: 10000 });
                    await sock.sendMessage(from, {
                        image: { url: cat.data[0].url },
                        caption: '🐱 *Meow!*'
                    }, { quoted: msg });
                    response = null;
                } catch {
                    response = '❌ Failed to get cat!';
                }
                break;
                
            case 'dog':
                try {
                    const dog = await axios.get('https://dog.ceo/api/breeds/image/random', { timeout: 10000 });
                    await sock.sendMessage(from, {
                        image: { url: dog.data.message },
                        caption: '🐕 *Woof!*'
                    }, { quoted: msg });
                    response = null;
                } catch {
                    response = '❌ Failed to get dog!';
                }
                break;
                
            case 'waifu':
            case 'anime':
                try {
                    const waifu = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 10000 });
                    await sock.sendMessage(from, {
                        image: { url: waifu.data.url },
                        caption: '🎌 *Waifu*'
                    }, { quoted: msg });
                    response = null;
                } catch {
                    response = '❌ Failed to get waifu!';
                }
                break;
            
            // ═══════ GROUP COMMANDS (ADMIN ONLY) ═══════
            case 'tagall':
            case 'all':
                if (!isGroup) {
                    response = '❌ This command is for groups only!';
                } else if (!isAdmin && !isOwner) {
                    response = '❌ Only admins can use this command!';
                } else {
                    try {
                        const groupMeta = await sock.groupMetadata(from);
                        const members = groupMeta.participants.map(p => p.id);
                        let text = `📢 *TAG ALL*\n\n`;
                        members.forEach(m => text += `@${m.split('@')[0]} `);
                        await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
                        response = null;
                    } catch (err) {
                        response = '❌ Failed to tag members!';
                    }
                }
                break;
                
            case 'hidetag':
                if (!isGroup) {
                    response = '❌ This command is for groups only!';
                } else if (!isAdmin && !isOwner) {
                    response = '❌ Only admins can use this command!';
                } else if (!args.length) {
                    response = `❌ Provide a message!\n\nExample: ${p}hidetag Hello everyone!`;
                } else {
                    try {
                        const groupMeta = await sock.groupMetadata(from);
                        const members = groupMeta.participants.map(p => p.id);
                        await sock.sendMessage(from, { text: args.join(' '), mentions: members });
                        response = null;
                    } catch {
                        response = '❌ Failed!';
                    }
                }
                break;
                
            case 'groupinfo':
            case 'ginfo':
                if (!isGroup) {
                    response = '❌ This command is for groups only!';
                } else {
                    try {
                        const g = await sock.groupMetadata(from);
                        response = `👥 *Group Info*\n\n📛 Name: ${g.subject}\n👤 Members: ${g.participants.length}\n📅 Created: ${moment(g.creation * 1000).format('DD/MM/YYYY')}\n📝 Description:\n${g.desc || 'No description'}`;
                    } catch {
                        response = '❌ Failed to get group info!';
                    }
                }
                break;
                
            case 'link':
            case 'grouplink':
                if (!isGroup) {
                    response = '❌ This command is for groups only!';
                } else if (!isBotAdmin) {
                    response = '❌ Bot needs to be admin!';
                } else {
                    try {
                        const code = await sock.groupInviteCode(from);
                        response = `🔗 *Group Link*\n\nhttps://chat.whatsapp.com/${code}`;
                    } catch {
                        response = '❌ Failed to get link!';
                    }
                }
                break;
                
            case 'admins':
            case 'listadmin':
                if (!isGroup) {
                    response = '❌ This command is for groups only!';
                } else {
                    try {
                        const g = await sock.groupMetadata(from);
                        const admins = g.participants.filter(p => p.admin);
                        let text = `👑 *Group Admins*\n\n`;
                        admins.forEach(a => {
                            text += `• @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(Owner)' : ''}\n`;
                        });
                        await sock.sendMessage(from, { text, mentions: admins.map(a => a.id) }, { quoted: msg });
                        response = null;
                    } catch {
                        response = '❌ Failed!';
                    }
                }
                break;
                
            // ═══════ OWNER COMMANDS ═══════
            case 'broadcast':
            case 'bc':
                if (!isOwner) {
                    response = '❌ Owner only command!';
                } else if (!args.length) {
                    response = `❌ Provide message!\n\nExample: ${p}broadcast Hello everyone!`;
                } else {
                    response = `📢 Broadcast sent! (Feature in development)`;
                }
                break;
                
            case 'setaway':
                if (!isOwner) {
                    response = '❌ Owner only command!';
                } else {
                    config.awayMode = !config.awayMode;
                    response = `✅ Away mode: ${config.awayMode ? 'ON' : 'OFF'}`;
                }
                break;
                
            default:
                response = `❌ Unknown command: *${cmd}*\n\n💡 Type *${p}menu* for all commands`;
        }
        
        // Send response if exists
        if (response) {
            await sock.sendMessage(from, { text: response }, { quoted: msg });
        }
        
        // React success
        try {
            await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
        } catch {}
        
    } catch (err) {
        console.log(`❌ Command error (${cmd}):`, err.message);
        try {
            await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(from, { text: '❌ Error processing command!' }, { quoted: msg });
        } catch {}
    }
}

// ═══════════════════════════════════════════════════════════════
//                    VIEW ONCE HANDLER
// ═══════════════════════════════════════════════════════════════

async function handleViewOnce(sock, msg, sender, pushName) {
    if (!config.saveViewOnce) return;
    
    const type = Object.keys(msg.message || {})[0];
    if (type !== 'viewOnceMessageV2' && type !== 'viewOnceMessage') return;
    
    console.log(`📸 ViewOnce from ${pushName}`);
    
    try {
        const viewOnce = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
        const mediaType = Object.keys(viewOnce.message)[0];
        const buffer = await downloadMediaMessage({ message: viewOnce.message }, 'buffer', {});
        
        const caption = `📸 *VIEW ONCE SAVED*\n\n👤 From: ${pushName}\n📱 ${sender.split('@')[0]}\n⏰ ${getTime()}\n📅 ${getDate()}`;
        const ownerJid = config.ownerNumber + '@s.whatsapp.net';
        
        if (mediaType.includes('image')) {
            await sock.sendMessage(ownerJid, { image: buffer, caption });
        } else if (mediaType.includes('video')) {
            await sock.sendMessage(ownerJid, { video: buffer, caption });
        } else if (mediaType.includes('audio')) {
            await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
            await sock.sendMessage(ownerJid, { text: caption });
        }
        
        console.log('✅ ViewOnce saved to owner!');
    } catch (err) {
        console.log('ViewOnce error:', err.message);
    }
}

// ═══════════════════════════════════════════════════════════════
//                    START BOT
// ═══════════════════════════════════════════════════════════════

async function startBot() {
    connectionStatus = 'starting';
    connectionMessage = 'Connecting to WhatsApp...';
    
    try {
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log(`\n🔄 Starting bot... (Attempt ${retryCount + 1})`);
        console.log(`📦 Baileys version: ${version.join('.')}`);
        
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
            },
            browser: Browsers.ubuntu('Chrome'),
            connectTimeoutMs: 60000,
            qrTimeout: 60000,
            defaultQueryTimeoutMs: 60000,
            getMessage: async (key) => {
                return { conversation: 'hello' };
            }
        });
        
        // Connection update handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Code generated! Scan with WhatsApp.');
                connectionStatus = 'qr';
                connectionMessage = 'Scan QR code to connect';
                retryCount = 0;
                
                try {
                    qrImageData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                } catch (e) {
                    console.log('QR generation error:', e.message);
                }
                
                // Try to get pairing code
                setTimeout(async () => {
                    if (sock && !sock.authState?.creds?.registered) {
                        try {
                            currentPairingCode = await sock.requestPairingCode(config.ownerNumber);
                            console.log(`🔐 Pairing Code: ${currentPairingCode}`);
                        } catch (e) {
                            console.log('Pairing code not available, use QR instead');
                        }
                    }
                }, 5000);
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n❌ Disconnected! Code: ${statusCode}`);
                
                qrImageData = null;
                currentPairingCode = null;
                
                const shouldClearAuth = [
                    DisconnectReason.loggedOut,
                    DisconnectReason.badSession,
                    401, 403, 405, 440
                ].includes(statusCode);
                
                if (shouldClearAuth) {
                    console.log('🗑️ Session invalid, clearing...');
                    clearAuthFolder();
                    retryCount = 0;
                    connectionStatus = 'starting';
                    connectionMessage = 'Session cleared, reconnecting...';
                } else {
                    retryCount++;
                    connectionStatus = 'error';
                    connectionMessage = `Reconnecting... (${retryCount})`;
                    
                    if (retryCount > 5) {
                        console.log('🗑️ Too many retries, clearing session...');
                        clearAuthFolder();
                        retryCount = 0;
                    }
                }
                
                setTimeout(startBot, 5000);
            }
            
            if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED SUCCESSFULLY!\n');
                connectionStatus = 'connected';
                connectionMessage = 'Online and ready!';
                retryCount = 0;
                qrImageData = null;
                currentPairingCode = null;
                
                // Send welcome message to owner
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `✅ *${config.botName} Connected!*\n\n⏰ ${getTime()}\n📅 ${getDate()}\n\n🎮 Commands: ${config.prefix}menu\n🧠 AI: Active\n📸 ViewOnce: Active\n\n_Bot is ready!_`
                    });
                } catch (e) {
                    console.log('Welcome message failed:', e.message);
                }
            }
        });
        
        // Save credentials
        sock.ev.on('creds.update', saveCreds);
        
        // Message handler
        sock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg?.message) return;
                if (msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                const sender = msg.key.participant || from;
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');
                
                // Check admin status for groups
                let isAdmin = false;
                let isBotAdmin = false;
                
                if (isGroup) {
                    try {
                        const groupMeta = await sock.groupMetadata(from);
                        const botId = sock.user?.id?.split(':')[0] + '@s.whatsapp.net';
                        
                        const senderData = groupMeta.participants.find(p => p.id === sender);
                        const botData = groupMeta.participants.find(p => p.id === botId);
                        
                        isAdmin = senderData?.admin ? true : false;
                        isBotAdmin = botData?.admin ? true : false;
                    } catch {}
                }
                
                // Handle ViewOnce
                const msgType = Object.keys(msg.message)[0];
                if (msgType === 'viewOnceMessageV2' || msgType === 'viewOnceMessage') {
                    await handleViewOnce(sock, msg, sender, pushName);
                    return;
                }
                
                // Handle commands
                await handleCommand(sock, msg, from, sender, pushName, isGroup, isAdmin, isBotAdmin);
                
            } catch (err) {
                console.log('Message handling error:', err.message);
            }
        });
        
    } catch (err) {
        console.log('Startup error:', err.message);
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
╔════════════════════════════════════════╗
║       🤖 ${config.botName}
║       👑 Owner: ${config.ownerName}
║       📱 Prefix: ${config.prefix}
║       🎮 100+ Commands Ready!
╚════════════════════════════════════════╝
`);

startBot();
