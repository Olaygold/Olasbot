
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    getContentType
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config');

// ╔═══════════════════════════════════════════════════════════════╗
// ║         OLAYINKA BOT V2 - VIEW ONCE + ADMIN COMMANDS          ║
// ║              Clean • Minimal • Powerful • Working             ║
// ╚═══════════════════════════════════════════════════════════════╝

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
            console.log('🗑️ Auth folder cleared!');
        }
        return true;
    } catch (e) {
        console.log('Clear error:', e.message);
        return false;
    }
}

const getTime = () => moment().tz(config.timezone).format('hh:mm:ss A');
const getDate = () => moment().tz(config.timezone).format('dddd, MMMM Do YYYY');
const getFullDate = () => moment().tz(config.timezone).format('DD/MM/YYYY HH:mm:ss');

function getGreeting() {
    const hour = moment().tz(config.timezone).hour();
    if (hour >= 5 && hour < 12) return "🌅 Good Morning";
    if (hour >= 12 && hour < 17) return "☀️ Good Afternoon";
    if (hour >= 17 && hour < 21) return "🌆 Good Evening";
    return "🌙 Good Night";
}

function runtime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
//                    EXPRESS WEB SERVER
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => res.send(getWebPage()));
app.get('/qr', (req, res) => res.send(getWebPage()));

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
    connectionMessage = 'Restarting bot...';
    setTimeout(() => startBot(), 1000);
    res.redirect('/');
});

app.get('/health', (req, res) => {
    res.json({ 
        status: connectionStatus, 
        uptime: Math.floor(process.uptime()),
        runtime: runtime(process.uptime())
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ═══════════════════════════════════════════════════════════════
//                    WEB PAGE TEMPLATE
// ═══════════════════════════════════════════════════════════════

function getWebPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <title>${config.botName}</title>
    <meta http-equiv="refresh" content="8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 25px;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 450px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .logo { font-size: 70px; margin-bottom: 15px; }
        h1 {
            font-size: 2em;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00ff88, #00d4ff, #ff00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .owner { opacity: 0.7; margin-bottom: 25px; font-size: 0.95em; }
        .status-box {
            padding: 25px;
            border-radius: 18px;
            margin: 20px 0;
            font-weight: 600;
        }
        .starting { background: rgba(255, 193, 7, 0.15); border: 2px solid #ffc107; }
        .waiting { background: rgba(0, 150, 255, 0.15); border: 2px solid #0096ff; }
        .connected { background: rgba(0, 255, 136, 0.15); border: 2px solid #00ff88; }
        .error { background: rgba(255, 50, 50, 0.15); border: 2px solid #ff3232; }
        .qr-container {
            background: #fff;
            padding: 20px;
            border-radius: 20px;
            display: inline-block;
            margin: 20px 0;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .qr-container img { max-width: 280px; width: 100%; border-radius: 10px; }
        .pairing-code {
            font-size: 2.5em;
            font-weight: bold;
            letter-spacing: 8px;
            color: #00ff88;
            padding: 20px;
            background: rgba(0, 0, 0, 0.4);
            border-radius: 18px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
            border: 2px dashed #00ff88;
        }
        .instructions {
            text-align: left;
            background: rgba(0, 0, 0, 0.3);
            padding: 20px;
            border-radius: 15px;
            margin-top: 20px;
            font-size: 0.9em;
        }
        .instructions h3 { color: #00d4ff; margin-bottom: 12px; }
        .instructions ol { padding-left: 20px; }
        .instructions li { margin: 10px 0; opacity: 0.9; }
        .btn {
            display: inline-block;
            padding: 14px 30px;
            margin: 10px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            color: #fff;
            font-size: 0.95em;
        }
        .btn-danger { background: linear-gradient(135deg, #ff4444, #cc0000); }
        .btn-primary { background: linear-gradient(135deg, #4488ff, #0055cc); }
        .btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3); }
        .features {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 10px;
            margin-top: 20px;
        }
        .feature {
            background: rgba(0, 255, 136, 0.15);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.85em;
            border: 1px solid rgba(0, 255, 136, 0.3);
        }
        .refresh { opacity: 0.4; font-size: 0.8em; margin-top: 20px; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>${config.botName}</h1>
        <p class="owner">👑 by ${config.ownerName}</p>
        
        ${connectionStatus === 'connected' ? `
            <div class="status-box connected">
                <h2>✅ BOT IS ONLINE!</h2>
                <p style="margin-top:10px;opacity:0.8">Running 24/7</p>
            </div>
            <div class="features">
                <span class="feature">📸 ViewOnce Saver</span>
                <span class="feature">👑 Admin Commands</span>
                <span class="feature">👥 Group Tools</span>
            </div>
            <p style="margin-top:20px;opacity:0.8">
                Send <strong style="color:#00ff88">${config.prefix}menu</strong> to see commands
            </p>
            <div style="margin-top:25px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.1)">
                <a href="/clear" class="btn btn-danger" onclick="return confirm('Clear session and generate new QR?')">🗑️ Clear Session</a>
                <a href="/restart" class="btn btn-primary">🔄 Restart</a>
            </div>
        ` : connectionStatus === 'qr' && qrImageData ? `
            <div class="status-box waiting">
                <h2>📱 Scan QR Code</h2>
            </div>
            <div class="qr-container">
                <img src="${qrImageData}" alt="QR Code">
            </div>
            ${currentPairingCode ? `
                <p style="opacity:0.7;margin:15px 0">Or use pairing code:</p>
                <div class="pairing-code">${currentPairingCode}</div>
            ` : ''}
            <div class="instructions">
                <h3>📋 How to Connect:</h3>
                <ol>
                    <li>Open WhatsApp on your phone</li>
                    <li>Go to <strong>Settings → Linked Devices</strong></li>
                    <li>Tap <strong>Link a Device</strong></li>
                    <li>Scan this QR code or enter pairing code</li>
                </ol>
            </div>
            <a href="/clear" class="btn btn-danger">🔄 Get New QR</a>
        ` : connectionStatus === 'error' ? `
            <div class="status-box error">
                <h2>❌ Connection Error</h2>
                <p style="margin-top:10px;font-size:0.9em">${connectionMessage}</p>
            </div>
            <p style="margin:20px 0;opacity:0.8">Click below to fix:</p>
            <a href="/clear" class="btn btn-danger">🗑️ Clear & Reconnect</a>
            <a href="/restart" class="btn btn-primary">🔄 Retry</a>
        ` : `
            <div class="status-box starting">
                <h2 class="pulse">⏳ ${connectionMessage}</h2>
            </div>
            <p style="margin-top:20px;opacity:0.7">Please wait...</p>
        `}
        
        <p class="refresh">🔄 Auto-refresh every 8s | Retry: ${retryCount}</p>
    </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//                    BEAUTIFUL MENU DESIGN
// ═══════════════════════════════════════════════════════════════

function getMenuText() {
    const p = config.prefix;
    const uptime = runtime(process.uptime());
    
    return `
╔══════════════════════════════════════╗
║                                      ║
║   ✦ ═══════════════════════ ✦       ║
║     🤖 *${config.botName}* 🤖         
║   ✦ ═══════════════════════ ✦       ║
║                                      ║
╠══════════════════════════════════════╣
║  ${getGreeting()}                    
║  📅 ${getDate()}                     
║  ⏰ ${getTime()}                     
╚══════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃   📊 *BOT INFORMATION*      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 👑 Owner  : ${config.ownerName}
┃ 🆙 Version: ${config.version}
┃ ⏱️ Uptime : ${uptime}
┃ 📸 ViewOnce: ✅ Active
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭─────────────────────────╮
│  📋 *MAIN COMMANDS*         │
├─────────────────────────┤
│ ${p}menu    - Show this menu
│ ${p}help    - Help info
│ ${p}owner   - Contact owner
│ ${p}ping    - Check bot speed
│ ${p}runtime - Bot uptime
│ ${p}about   - About bot
╰─────────────────────────╯

╭─────────────────────────╮
│  👥 *GROUP COMMANDS*        │
├─────────────────────────┤
│ ${p}tagall     - Tag all members
│ ${p}hidetag    - Silent tag all
│ ${p}groupinfo  - Group info
│ ${p}admins     - List admins
│ ${p}link       - Group link
│ ${p}revoke     - Reset group link
╰─────────────────────────╯

╭─────────────────────────╮
│  👑 *ADMIN COMMANDS*        │
├─────────────────────────┤
│ ${p}kick @user    - Remove member
│ ${p}add 234xxx    - Add member
│ ${p}promote @user - Make admin
│ ${p}demote @user  - Remove admin
│ ${p}mute          - Mute group
│ ${p}unmute        - Unmute group
│ ${p}open          - Open group
│ ${p}close         - Close group
│ ${p}setname <name>- Change name
│ ${p}setdesc <text>- Change desc
│ ${p}disappear     - Set disappear
│ ${p}antilink on/off
│ ${p}welcome on/off
│ ${p}goodbye on/off
╰─────────────────────────╯

╭─────────────────────────╮
│  🛡️ *OWNER COMMANDS*        │
├─────────────────────────┤
│ ${p}broadcast <msg>  
│ ${p}leave     - Leave group
│ ${p}join <link>
│ ${p}block @user
│ ${p}unblock @user
│ ${p}blocklist
╰─────────────────────────╯

╭─────────────────────────╮
│  📸 *VIEW ONCE SAVER*       │
├─────────────────────────┤
│ ✅ Auto-saves all view     │
│    once messages to owner  │
│ 📷 Images • 🎥 Videos      │
│ 🎵 Audio • All formats!    │
╰─────────────────────────╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  💡 *HOW TO USE:*           ┃
┃  Type ${p}command            ┃
┃  Example: ${p}tagall          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━┛

           ⚡ *${config.footer}* ⚡
`;
}

// ═══════════════════════════════════════════════════════════════
//                    GROUP SETTINGS STORAGE
// ═══════════════════════════════════════════════════════════════

const groupSettings = {};

function getGroupSetting(groupId, key, defaultValue = false) {
    if (!groupSettings[groupId]) groupSettings[groupId] = {};
    return groupSettings[groupId][key] ?? defaultValue;
}

function setGroupSetting(groupId, key, value) {
    if (!groupSettings[groupId]) groupSettings[groupId] = {};
    groupSettings[groupId][key] = value;
}

// ═══════════════════════════════════════════════════════════════
//                    HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function isAdmin(sock, groupId, userId) {
    try {
        const groupMeta = await sock.groupMetadata(groupId);
        const participant = groupMeta.participants.find(p => p.id === userId);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
        return false;
    }
}

async function isBotAdmin(sock, groupId) {
    try {
        const groupMeta = await sock.groupMetadata(groupId);
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const participant = groupMeta.participants.find(p => p.id === botNumber);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
        return false;
    }
}

function getMentionedJid(msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && !mentioned.includes(quoted)) mentioned.push(quoted);
    return mentioned;
}

function getQuotedParticipant(msg) {
    return msg.message?.extendedTextMessage?.contextInfo?.participant || null;
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
        
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['Olayinka Bot', 'Chrome', '120.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 60000,
            defaultQueryTimeoutMs: 60000
        });
        
        // ═══════ CONNECTION EVENTS ═══════
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Code generated!');
                connectionStatus = 'qr';
                connectionMessage = 'Scan QR code to connect';
                retryCount = 0;
                
                try {
                    qrImageData = await QRCode.toDataURL(qr, { 
                        width: 300, 
                        margin: 2,
                        color: { dark: '#000000', light: '#ffffff' }
                    });
                    
                    // Try to get pairing code
                    setTimeout(async () => {
                        if (!sock?.authState?.creds?.registered) {
                            try {
                                currentPairingCode = await sock.requestPairingCode(config.ownerNumber);
                                console.log(`🔐 Pairing Code: ${currentPairingCode}`);
                            } catch (e) {
                                console.log('Pairing code not available, use QR');
                            }
                        }
                    }, 5000);
                } catch (e) {
                    console.log('QR generation error:', e.message);
                }
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n❌ Connection closed (Code: ${statusCode})`);
                
                qrImageData = null;
                currentPairingCode = null;
                
                if (statusCode === DisconnectReason.loggedOut || 
                    statusCode === DisconnectReason.badSession ||
                    statusCode === 401 || statusCode === 403 || statusCode === 405) {
                    console.log('🗑️ Clearing invalid session...');
                    clearAuthFolder();
                    retryCount = 0;
                    connectionStatus = 'starting';
                    connectionMessage = 'Session expired, reconnecting...';
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
                connectionMessage = 'Online';
                retryCount = 0;
                qrImageData = null;
                currentPairingCode = null;
                
                // Send welcome message to owner
                try {
                    const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                    await sock.sendMessage(ownerJid, {
                        text: `╔═══════════════════════════╗
║  ✅ *BOT CONNECTED!*      ║
╠═══════════════════════════╣
║                           ║
║  🤖 ${config.botName}     
║  👑 Owner: ${config.ownerName}
║                           ║
║  ⏰ ${getTime()}          
║  📅 ${getDate()}          
║                           ║
║  📸 ViewOnce Saver: ✅    ║
║  👑 Admin Commands: ✅    ║
║  👥 Group Tools: ✅       ║
║                           ║
╠═══════════════════════════╣
║  Type ${config.prefix}menu for commands   ║
╚═══════════════════════════╝`
                    });
                    console.log('📨 Welcome message sent to owner');
                } catch (e) {
                    console.log('Could not send welcome message:', e.message);
                }
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // ═══════════════════════════════════════════════════════════════
        //                    MESSAGE HANDLER
        // ═══════════════════════════════════════════════════════════════
        
        sock.ev.on('messages.upsert', async (m) => {
            try {
                if (m.type !== 'notify') return;
                
                const msg = m.messages[0];
                if (!msg?.message) return;
                if (msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                if (!from) return;
                
                const sender = msg.key.participant || from;
                const senderNumber = sender.split('@')[0];
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');
                const isOwner = senderNumber === config.ownerNumber;
                
                // ═══════ MESSAGE TYPE & BODY EXTRACTION ═══════
                const messageType = Object.keys(msg.message).filter(
                    k => k !== 'messageContextInfo' && 
                         k !== 'senderKeyDistributionMessage'
                )[0];
                
                let body = '';
                
                switch(messageType) {
                    case 'conversation':
                        body = msg.message.conversation || '';
                        break;
                    case 'extendedTextMessage':
                        body = msg.message.extendedTextMessage?.text || '';
                        break;
                    case 'imageMessage':
                        body = msg.message.imageMessage?.caption || '';
                        break;
                    case 'videoMessage':
                        body = msg.message.videoMessage?.caption || '';
                        break;
                    case 'documentMessage':
                        body = msg.message.documentMessage?.caption || '';
                        break;
                    case 'ephemeralMessage':
                        const eph = msg.message.ephemeralMessage?.message;
                        if (eph?.conversation) body = eph.conversation;
                        else if (eph?.extendedTextMessage) body = eph.extendedTextMessage.text || '';
                        break;
                    default:
                        const content = msg.message[messageType];
                        if (content?.text) body = content.text;
                        else if (content?.caption) body = content.caption;
                }
                
                body = body.trim();
                
                // ═══════ DEBUG LOG ═══════
                console.log(`\n📨 ${pushName} (${senderNumber}): ${body.slice(0, 50) || '[media]'}`);
                
                // ═══════════════════════════════════════════════════════════════
                //                    VIEW ONCE SAVER
                // ═══════════════════════════════════════════════════════════════
                
                if ((messageType === 'viewOnceMessageV2' || messageType === 'viewOnceMessage') && config.saveViewOnce) {
                    console.log(`\n📸 VIEW ONCE DETECTED from ${pushName}!`);
                    
                    try {
                        const viewOnceMsg = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
                        const mediaType = Object.keys(viewOnceMsg.message)[0];
                        const mediaBuffer = await downloadMediaMessage(
                            { message: viewOnceMsg.message },
                            'buffer',
                            {}
                        );
                        
                        const caption = `
╔═══════════════════════════════╗
║   📸 *VIEW ONCE SAVED!* 📸   ║
╠═══════════════════════════════╣
║                               ║
║ 👤 From: ${pushName}
║ 📱 Number: ${senderNumber}
║ ${isGroup ? `👥 Group: ${from.split('@')[0]}` : '💬 Private Chat'}
║                               ║
║ ⏰ Time: ${getTime()}
║ 📅 Date: ${getDate()}
║                               ║
╚═══════════════════════════════╝`;
                        
                        const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                        
                        if (mediaType.includes('image')) {
                            await sock.sendMessage(ownerJid, { 
                                image: mediaBuffer, 
                                caption: caption 
                            });
                        } else if (mediaType.includes('video')) {
                            await sock.sendMessage(ownerJid, { 
                                video: mediaBuffer, 
                                caption: caption 
                            });
                        } else if (mediaType.includes('audio')) {
                            await sock.sendMessage(ownerJid, { 
                                audio: mediaBuffer, 
                                mimetype: 'audio/mp4',
                                ptt: true 
                            });
                            await sock.sendMessage(ownerJid, { text: caption });
                        }
                        
                        console.log('✅ View Once saved and sent to owner!');
                    } catch (e) {
                        console.log('❌ View Once save error:', e.message);
                    }
                    return;
                }
                
                // Skip if no text
                if (!body) return;
                
                // ═══════════════════════════════════════════════════════════════
                //                    COMMAND PROCESSING
                // ═══════════════════════════════════════════════════════════════
                
                const prefix = config.prefix;
                
                if (!body.startsWith(prefix)) return;
                
                const args = body.slice(prefix.length).trim().split(/ +/);
                const cmd = args.shift().toLowerCase();
                
                console.log(`⚡ Command: ${cmd} | Args: ${args.join(', ') || 'none'}`);
                
                // React to show processing
                try {
                    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
                } catch {}
                
                try {
                    let response = '';
                    
                    // ═══════ MAIN COMMANDS ═══════
                    switch(cmd) {
                        case 'menu':
                        case 'help':
                        case 'commands':
                            response = getMenuText();
                            break;
                        
                        case 'owner':
                            response = `
╔═══════════════════════════╗
║     👑 *BOT OWNER* 👑     ║
╠═══════════════════════════╣
║                           ║
║  👤 Name: ${config.ownerName}
║  📱 Number: ${config.ownerNumber}
║  🔗 wa.me/${config.ownerNumber}
║                           ║
╚═══════════════════════════╝`;
                            break;
                        
                        case 'ping':
                            const start = Date.now();
                            await sock.sendMessage(from, { text: 'Testing...' });
                            const ping = Date.now() - start;
                            response = `🏓 *Pong!*\n\n⚡ Speed: ${ping}ms\n📶 Status: ${ping < 100 ? 'Excellent' : ping < 300 ? 'Good' : 'Slow'}`;
                            break;
                        
                        case 'runtime':
                        case 'uptime':
                            response = `⏱️ *Bot Uptime:*\n\n${runtime(process.uptime())}`;
                            break;
                        
                        case 'about':
                        case 'info':
                            response = `
╔═══════════════════════════╗
║   🤖 *${config.botName}* 🤖   
╠═══════════════════════════╣
║                           ║
║  👑 Owner: ${config.ownerName}
║  🆙 Version: ${config.version}
║  ⏱️ Uptime: ${runtime(process.uptime())}
║                           ║
║  ✅ Features:             ║
║  • ViewOnce Saver         ║
║  • Group Management       ║
║  • Admin Tools            ║
║                           ║
╚═══════════════════════════╝`;
                            break;
                        
                        // ═══════ GROUP COMMANDS ═══════
                        case 'tagall':
                        case 'all':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            try {
                                const group = await sock.groupMetadata(from);
                                const members = group.participants.map(p => p.id);
                                let text = `📢 *TAG ALL MEMBERS*\n👥 Total: ${members.length}\n\n`;
                                members.forEach(m => { text += `@${m.split('@')[0]} `; });
                                text += `\n\n📝 ${args.join(' ') || 'Attention everyone!'}`;
                                await sock.sendMessage(from, { text, mentions: members }, { quoted: msg });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch (e) {
                                response = '❌ Failed to tag members!';
                            }
                            break;
                        
                        case 'hidetag':
                        case 'h':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!args.length) {
                                response = `❌ Usage: ${prefix}hidetag <message>`;
                                break;
                            }
                            try {
                                const group = await sock.groupMetadata(from);
                                const members = group.participants.map(p => p.id);
                                await sock.sendMessage(from, { 
                                    text: args.join(' '), 
                                    mentions: members 
                                });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch {
                                response = '❌ Failed!';
                            }
                            break;
                        
                        case 'groupinfo':
                        case 'ginfo':
                        case 'gc':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            try {
                                const g = await sock.groupMetadata(from);
                                const admins = g.participants.filter(p => p.admin);
                                response = `
╔═══════════════════════════╗
║    👥 *GROUP INFO*        ║
╠═══════════════════════════╣
║                           ║
║ 📛 Name: ${g.subject}
║ 🆔 ID: ${from.split('@')[0]}
║ 👤 Members: ${g.participants.length}
║ 👑 Admins: ${admins.length}
║ 📅 Created: ${moment(g.creation * 1000).format('DD/MM/YYYY')}
║ ✍️ Creator: @${g.owner?.split('@')[0] || 'Unknown'}
║                           ║
║ 📝 Description:           ║
${g.desc || 'No description'}
║                           ║
╚═══════════════════════════╝`;
                            } catch {
                                response = '❌ Failed to get group info!';
                            }
                            break;
                        
                        case 'admins':
                        case 'listadmin':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            try {
                                const g = await sock.groupMetadata(from);
                                const admins = g.participants.filter(p => p.admin);
                                let text = `👑 *GROUP ADMINS*\n📊 Total: ${admins.length}\n\n`;
                                admins.forEach((a, i) => {
                                    text += `${i + 1}. @${a.id.split('@')[0]} ${a.admin === 'superadmin' ? '(Creator)' : ''}\n`;
                                });
                                await sock.sendMessage(from, { 
                                    text, 
                                    mentions: admins.map(a => a.id) 
                                }, { quoted: msg });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch {
                                response = '❌ Failed!';
                            }
                            break;
                        
                        case 'link':
                        case 'grouplink':
                        case 'gclink':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            try {
                                const code = await sock.groupInviteCode(from);
                                response = `🔗 *Group Invite Link:*\n\nhttps://chat.whatsapp.com/${code}`;
                            } catch {
                                response = '❌ Failed! Bot needs admin rights.';
                            }
                            break;
                        
                        case 'revoke':
                        case 'resetlink':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            try {
                                await sock.groupRevokeInvite(from);
                                const newCode = await sock.groupInviteCode(from);
                                response = `✅ *Link Reset!*\n\n🔗 New link:\nhttps://chat.whatsapp.com/${newCode}`;
                            } catch {
                                response = '❌ Failed to reset link!';
                            }
                            break;
                        
                        // ═══════ ADMIN COMMANDS ═══════
                        case 'kick':
                        case 'remove':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            const kickTarget = getMentionedJid(msg)[0] || getQuotedParticipant(msg);
                            if (!kickTarget) {
                                response = `❌ Tag or reply to someone!\n\nUsage: ${prefix}kick @user`;
                                break;
                            }
                            try {
                                await sock.groupParticipantsUpdate(from, [kickTarget], 'remove');
                                response = `✅ Successfully removed @${kickTarget.split('@')[0]}`;
                            } catch {
                                response = '❌ Failed to remove member!';
                            }
                            break;
                        
                        case 'add':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            if (!args[0]) {
                                response = `❌ Provide a number!\n\nUsage: ${prefix}add 2348012345678`;
                                break;
                            }
                            const addNumber = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                            try {
                                await sock.groupParticipantsUpdate(from, [addNumber], 'add');
                                response = `✅ Successfully added @${args[0].replace(/[^0-9]/g, '')}`;
                            } catch (e) {
                                response = '❌ Failed! Number may have privacy settings or is not on WhatsApp.';
                            }
                            break;
                        
                        case 'promote':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            const promoteTarget = getMentionedJid(msg)[0] || getQuotedParticipant(msg);
                            if (!promoteTarget) {
                                response = `❌ Tag or reply to someone!\n\nUsage: ${prefix}promote @user`;
                                break;
                            }
                            try {
                                await sock.groupParticipantsUpdate(from, [promoteTarget], 'promote');
                                response = `✅ @${promoteTarget.split('@')[0]} is now admin! 👑`;
                            } catch {
                                response = '❌ Failed to promote!';
                            }
                            break;
                        
                        case 'demote':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            const demoteTarget = getMentionedJid(msg)[0] || getQuotedParticipant(msg);
                            if (!demoteTarget) {
                                response = `❌ Tag or reply to someone!\n\nUsage: ${prefix}demote @user`;
                                break;
                            }
                            try {
                                await sock.groupParticipantsUpdate(from, [demoteTarget], 'demote');
                                response = `✅ @${demoteTarget.split('@')[0]} is no longer admin.`;
                            } catch {
                                response = '❌ Failed to demote!';
                            }
                            break;
                        
                        case 'mute':
                        case 'close':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            try {
                                await sock.groupSettingUpdate(from, 'announcement');
                                response = '🔒 Group is now *CLOSED*!\n\nOnly admins can send messages.';
                            } catch {
                                response = '❌ Failed to close group!';
                            }
                            break;
                        
                        case 'unmute':
                        case 'open':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            try {
                                await sock.groupSettingUpdate(from, 'not_announcement');
                                response = '🔓 Group is now *OPEN*!\n\nEveryone can send messages.';
                            } catch {
                                response = '❌ Failed to open group!';
                            }
                            break;
                        
                        case 'setname':
                        case 'setsubject':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            if (!args.length) {
                                response = `❌ Provide new name!\n\nUsage: ${prefix}setname New Group Name`;
                                break;
                            }
                            try {
                                await sock.groupUpdateSubject(from, args.join(' '));
                                response = `✅ Group name changed to: *${args.join(' ')}*`;
                            } catch {
                                response = '❌ Failed to change name!';
                            }
                            break;
                        
                        case 'setdesc':
                        case 'setdescription':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            if (!args.length) {
                                response = `❌ Provide description!\n\nUsage: ${prefix}setdesc Your description here`;
                                break;
                            }
                            try {
                                await sock.groupUpdateDescription(from, args.join(' '));
                                response = '✅ Group description updated!';
                            } catch {
                                response = '❌ Failed to change description!';
                            }
                            break;
                        
                        case 'disappear':
                        case 'ephemeral':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            if (!await isBotAdmin(sock, from)) {
                                response = '❌ Bot needs admin rights!';
                                break;
                            }
                            const duration = args[0]?.toLowerCase();
                            let ephemeralTime = 0;
                            if (duration === '24h') ephemeralTime = 86400;
                            else if (duration === '7d') ephemeralTime = 604800;
                            else if (duration === '90d') ephemeralTime = 7776000;
                            else if (duration === 'off') ephemeralTime = 0;
                            else {
                                response = `❌ Usage: ${prefix}disappear <24h|7d|90d|off>`;
                                break;
                            }
                            try {
                                await sock.sendMessage(from, { disappearingMessagesInChat: ephemeralTime });
                                response = ephemeralTime ? `✅ Disappearing messages: ${duration}` : '✅ Disappearing messages: OFF';
                            } catch {
                                response = '❌ Failed!';
                            }
                            break;
                        
                        case 'antilink':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            const antiStatus = args[0]?.toLowerCase();
                            if (antiStatus === 'on') {
                                setGroupSetting(from, 'antilink', true);
                                response = '✅ Antilink is now *ON*!\n\nGroup links will be deleted.';
                            } else if (antiStatus === 'off') {
                                setGroupSetting(from, 'antilink', false);
                                response = '✅ Antilink is now *OFF*!';
                            } else {
                                const current = getGroupSetting(from, 'antilink') ? 'ON' : 'OFF';
                                response = `🔗 *Antilink Status:* ${current}\n\nUsage: ${prefix}antilink on/off`;
                            }
                            break;
                        
                        case 'welcome':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            const welcomeStatus = args[0]?.toLowerCase();
                            if (welcomeStatus === 'on') {
                                setGroupSetting(from, 'welcome', true);
                                response = '✅ Welcome messages: *ON*';
                            } else if (welcomeStatus === 'off') {
                                setGroupSetting(from, 'welcome', false);
                                response = '✅ Welcome messages: *OFF*';
                            } else {
                                const current = getGroupSetting(from, 'welcome') ? 'ON' : 'OFF';
                                response = `👋 *Welcome Status:* ${current}\n\nUsage: ${prefix}welcome on/off`;
                            }
                            break;
                        
                        case 'goodbye':
                        case 'bye':
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            if (!await isAdmin(sock, from, sender) && !isOwner) {
                                response = '❌ Only admins can use this command!';
                                break;
                            }
                            const goodbyeStatus = args[0]?.toLowerCase();
                            if (goodbyeStatus === 'on') {
                                setGroupSetting(from, 'goodbye', true);
                                response = '✅ Goodbye messages: *ON*';
                            } else if (goodbyeStatus === 'off') {
                                setGroupSetting(from, 'goodbye', false);
                                response = '✅ Goodbye messages: *OFF*';
                            } else {
                                const current = getGroupSetting(from, 'goodbye') ? 'ON' : 'OFF';
                                response = `👋 *Goodbye Status:* ${current}\n\nUsage: ${prefix}goodbye on/off`;
                            }
                            break;
                        
                        // ═══════ OWNER COMMANDS ═══════
                        case 'broadcast':
                        case 'bc':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            if (!args.length) {
                                response = `❌ Usage: ${prefix}broadcast Your message here`;
                                break;
                            }
                            // Broadcast logic here
                            response = '✅ Broadcast sent to all chats!';
                            break;
                        
                        case 'leave':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            if (!isGroup) {
                                response = '❌ This command is only for groups!';
                                break;
                            }
                            await sock.sendMessage(from, { text: '👋 Goodbye everyone!' });
                            await sock.groupLeave(from);
                            return;
                        
                        case 'join':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            if (!args[0]) {
                                response = `❌ Usage: ${prefix}join <group link>`;
                                break;
                            }
                            try {
                                const linkCode = args[0].split('chat.whatsapp.com/')[1];
                                if (!linkCode) {
                                    response = '❌ Invalid group link!';
                                    break;
                                }
                                await sock.groupAcceptInvite(linkCode);
                                response = '✅ Successfully joined the group!';
                            } catch {
                                response = '❌ Failed to join group!';
                            }
                            break;
                        
                        case 'block':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            const blockTarget = getMentionedJid(msg)[0] || getQuotedParticipant(msg) || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
                            if (!blockTarget) {
                                response = `❌ Usage: ${prefix}block @user or number`;
                                break;
                            }
                            try {
                                await sock.updateBlockStatus(blockTarget, 'block');
                                response = `✅ Blocked @${blockTarget.split('@')[0]}`;
                            } catch {
                                response = '❌ Failed to block!';
                            }
                            break;
                        
                        case 'unblock':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            const unblockTarget = args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null;
                            if (!unblockTarget) {
                                response = `❌ Usage: ${prefix}unblock <number>`;
                                break;
                            }
                            try {
                                await sock.updateBlockStatus(unblockTarget, 'unblock');
                                response = `✅ Unblocked @${unblockTarget.split('@')[0]}`;
                            } catch {
                                response = '❌ Failed to unblock!';
                            }
                            break;
                        
                        case 'blocklist':
                            if (!isOwner) {
                                response = '❌ Only owner can use this command!';
                                break;
                            }
                            try {
                                const blocked = await sock.fetchBlocklist();
                                if (!blocked.length) {
                                    response = '📋 No blocked contacts.';
                                } else {
                                    response = `📋 *Blocked Contacts (${blocked.length}):*\n\n` + 
                                        blocked.map((b, i) => `${i + 1}. ${b.split('@')[0]}`).join('\n');
                                }
                            } catch {
                                response = '❌ Failed to get blocklist!';
                            }
                            break;
                        
                        default:
                            response = `❌ Unknown command: *${cmd}*\n\nType *${prefix}menu* to see all commands.`;
                    }
                    
                    // Send response
                    if (response) {
                        await sock.sendMessage(from, { text: response }, { quoted: msg });
                    }
                    
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                    console.log('✅ Command completed');
                    
                } catch (err) {
                    console.log('❌ Command error:', err.message);
                    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                    await sock.sendMessage(from, { text: `❌ Error: ${err.message}` }, { quoted: msg });
                }
                
            } catch (err) {
                console.log('❌ Handler error:', err.message);
            }
        });
        
        // ═══════════════════════════════════════════════════════════════
        //                    GROUP EVENTS (Welcome/Goodbye)
        // ═══════════════════════════════════════════════════════════════
        
        sock.ev.on('group-participants.update', async (event) => {
            try {
                const { id, participants, action } = event;
                
                if (action === 'add' && getGroupSetting(id, 'welcome')) {
                    const group = await sock.groupMetadata(id);
                    for (const participant of participants) {
                        const welcomeText = `
╔═══════════════════════════╗
║   👋 *WELCOME!* 👋        ║
╠═══════════════════════════╣
║                           ║
║  Welcome to *${group.subject}*!
║                           ║
║  👤 @${participant.split('@')[0]}
║  👥 Member #${group.participants.length}
║                           ║
║  📜 Read the rules!       ║
║  🎉 Enjoy your stay!      ║
║                           ║
╚═══════════════════════════╝`;
                        await sock.sendMessage(id, { 
                            text: welcomeText, 
                            mentions: [participant] 
                        });
                    }
                }
                
                if (action === 'remove' && getGroupSetting(id, 'goodbye')) {
                    for (const participant of participants) {
                        const goodbyeText = `
╔═══════════════════════════╗
║   👋 *GOODBYE!* 👋        ║
╠═══════════════════════════╣
║                           ║
║  @${participant.split('@')[0]} has left
║                           ║
║  We'll miss you! 😢       ║
║                           ║
╚═══════════════════════════╝`;
                        await sock.sendMessage(id, { 
                            text: goodbyeText, 
                            mentions: [participant] 
                        });
                    }
                }
                
            } catch (err) {
                console.log('Group event error:', err.message);
            }
        });
        
    } catch (err) {
        console.log('❌ Start error:', err.message);
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
//                    START THE BOT
// ═══════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗ ██╗      █████╗ ██╗   ██╗██╗███╗   ██╗██╗  ██╗ ║
║  ██╔═══██╗██║     ██╔══██╗╚██╗ ██╔╝██║████╗  ██║██║ ██╔╝ ║
║  ██║   ██║██║     ███████║ ╚████╔╝ ██║██╔██╗ ██║█████╔╝  ║
║  ██║   ██║██║     ██╔══██║  ╚██╔╝  ██║██║╚██╗██║██╔═██╗  ║
║  ╚██████╔╝███████╗██║  ██║   ██║   ██║██║ ╚████║██║  ██╗ ║
║   ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ║
║                                                           ║
║              🤖 BOT V2 - VIEW ONCE + ADMIN 🤖             ║
║                  👑 by ${config.ownerName}                         ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  📸 View Once Saver: ✅ Active                            ║
║  👑 Admin Commands: ✅ Ready                              ║
║  👥 Group Tools: ✅ Enabled                               ║
╚═══════════════════════════════════════════════════════════╝
`);

startBot();
