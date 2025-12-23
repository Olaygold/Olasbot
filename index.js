
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    makeInMemoryStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
const moment = require('moment-timezone');
const config = require('./config');

// ╔═══════════════════════════════════════════════════════════════╗
// ║      OLAYINKA BOT V3 - FIXED PAIRING + VIEW ONCE + ADMIN      ║
// ║                    100% WORKING VERSION                        ║
// ╚═══════════════════════════════════════════════════════════════╝

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info';

// State Variables
let qrImageData = null;
let pairingCode = null;
let connectionStatus = 'disconnected';
let sock = null;
let retryCount = 0;

// Group Settings Storage
const groupSettings = new Map();

// ═══════════════════════════════════════════════════════════════
//                    UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function clearAuth() {
    try {
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        }
        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        console.log('🗑️ Auth cleared!');
        return true;
    } catch (e) {
        console.log('Clear error:', e.message);
        return false;
    }
}

const getTime = () => moment().tz(config.timezone).format('hh:mm:ss A');
const getDate = () => moment().tz(config.timezone).format('DD/MM/YYYY');
const getFullDate = () => moment().tz(config.timezone).format('dddd, DD MMMM YYYY');

function getGreeting() {
    const h = moment().tz(config.timezone).hour();
    if (h >= 5 && h < 12) return "🌅 Good Morning";
    if (h >= 12 && h < 17) return "☀️ Good Afternoon";
    if (h >= 17 && h < 21) return "🌆 Good Evening";
    return "🌙 Good Night";
}

function runtime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════
//                    EXPRESS SERVER
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => res.send(getWebPage()));

app.get('/pair', async (req, res) => {
    const number = req.query.number || config.ownerNumber;
    if (sock && !sock.authState?.creds?.registered) {
        try {
            const code = await sock.requestPairingCode(number);
            pairingCode = code;
            console.log(`🔐 New pairing code for ${number}: ${code}`);
        } catch (e) {
            console.log('Pairing error:', e.message);
        }
    }
    res.redirect('/');
});

app.get('/clear', (req, res) => {
    clearAuth();
    connectionStatus = 'disconnected';
    qrImageData = null;
    pairingCode = null;
    retryCount = 0;
    if (sock) {
        try { sock.end(); } catch {}
    }
    setTimeout(() => startBot(), 2000);
    res.redirect('/');
});

app.get('/restart', (req, res) => {
    if (sock) {
        try { sock.end(); } catch {}
    }
    setTimeout(() => startBot(), 1000);
    res.redirect('/');
});

app.listen(PORT, () => console.log(`🌐 Server: http://localhost:${PORT}`));

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
        body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px}
        .box{text-align:center;padding:30px;background:rgba(0,0,0,0.3);border-radius:20px;max-width:400px;width:100%}
        h1{color:#00ff88;margin:15px 0}
        .status{padding:20px;border-radius:15px;margin:20px 0}
        .online{background:rgba(0,255,100,0.2);border:2px solid #00ff88}
        .offline{background:rgba(255,200,0,0.2);border:2px solid #ffcc00}
        .error{background:rgba(255,50,50,0.2);border:2px solid #ff4444}
        .qr{background:#fff;padding:15px;border-radius:15px;display:inline-block;margin:15px 0}
        .qr img{max-width:250px}
        .code{font-size:2em;font-weight:bold;letter-spacing:5px;color:#00ff88;background:#000;padding:15px 25px;border-radius:10px;margin:15px 0;display:inline-block;border:2px dashed #00ff88}
        .btn{display:inline-block;padding:12px 25px;margin:8px;border-radius:10px;text-decoration:none;color:#fff;font-weight:bold}
        .btn-red{background:#ff4444}
        .btn-blue{background:#4488ff}
        .btn-green{background:#00aa55}
        input{padding:10px;border-radius:8px;border:none;margin:5px;width:200px;text-align:center}
        .info{opacity:0.7;font-size:0.9em;margin-top:15px}
    </style>
</head>
<body>
<div class="box">
    <h1>🤖 ${config.botName}</h1>
    <p>by ${config.ownerName}</p>
    
    ${connectionStatus === 'connected' ? `
        <div class="status online">
            <h2>✅ ONLINE</h2>
            <p>Bot is running!</p>
        </div>
        <p>Send <b>!menu</b> to use</p>
        <div style="margin-top:20px">
            <a href="/clear" class="btn btn-red">🗑️ Logout</a>
            <a href="/restart" class="btn btn-blue">🔄 Restart</a>
        </div>
    ` : connectionStatus === 'qr' ? `
        <div class="status offline">
            <h2>📱 Scan to Connect</h2>
        </div>
        
        ${qrImageData ? `<div class="qr"><img src="${qrImageData}"></div>` : ''}
        
        ${pairingCode ? `
            <p>Or use this code:</p>
            <div class="code">${pairingCode}</div>
        ` : `
            <p style="margin:15px 0">Get pairing code:</p>
            <form action="/pair" method="get">
                <input type="text" name="number" placeholder="2349064767251" value="${config.ownerNumber}">
                <br>
                <button type="submit" class="btn btn-green">Get Code</button>
            </form>
        `}
        
        <div style="margin-top:15px;text-align:left;background:rgba(0,0,0,0.3);padding:15px;border-radius:10px">
            <b>How to connect:</b><br>
            1. Open WhatsApp<br>
            2. Settings → Linked Devices<br>
            3. Link a Device<br>
            4. Scan QR or enter code
        </div>
        
        <a href="/clear" class="btn btn-red" style="margin-top:15px">🔄 New QR</a>
    ` : `
        <div class="status error">
            <h2>⏳ ${connectionStatus === 'connecting' ? 'Connecting...' : 'Waiting...'}</h2>
        </div>
        <a href="/clear" class="btn btn-red">🗑️ Reset</a>
    `}
    
    <p class="info">Auto-refresh every 5s</p>
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
//                    MENU
// ═══════════════════════════════════════════════════════════════

function getMenu() {
    const p = config.prefix;
    return `
╔══════════════════════════════╗
║  🤖 *${config.botName}* 🤖
╠══════════════════════════════╣
║  ${getGreeting()}
║  📅 ${getFullDate()}
║  ⏰ ${getTime()}
║  ⏱️ Uptime: ${runtime(process.uptime())}
╚══════════════════════════════╝

┏━━━ 📋 *MAIN* ━━━┓
┃ ${p}menu - This menu
┃ ${p}ping - Check speed
┃ ${p}owner - Contact owner
┃ ${p}runtime - Bot uptime
┗━━━━━━━━━━━━━━━━━┛

┏━━━ 👥 *GROUP* ━━━┓
┃ ${p}tagall - Tag everyone
┃ ${p}hidetag <msg> - Silent tag
┃ ${p}groupinfo - Group info
┃ ${p}admins - List admins
┃ ${p}link - Group link
┃ ${p}revoke - Reset link
┗━━━━━━━━━━━━━━━━━━┛

┏━━━ 👑 *ADMIN* ━━━┓
┃ ${p}kick @user - Remove user
┃ ${p}add 234xxx - Add user
┃ ${p}promote @user - Make admin
┃ ${p}demote @user - Remove admin
┃ ${p}mute - Close group
┃ ${p}unmute - Open group
┃ ${p}setname <name>
┃ ${p}setdesc <desc>
┃ ${p}antilink on/off
┃ ${p}welcome on/off
┃ ${p}goodbye on/off
┗━━━━━━━━━━━━━━━━━━┛

┏━━━ 🛡️ *OWNER* ━━━┓
┃ ${p}join <link> - Join group
┃ ${p}leave - Leave group
┃ ${p}block @user
┃ ${p}unblock <number>
┗━━━━━━━━━━━━━━━━━━┛

┏━━━ 📸 *VIEW ONCE* ━━━┓
┃ ✅ Auto-saves all view
┃ once media to owner!
┗━━━━━━━━━━━━━━━━━━━━━━┛

_Type ${p}command to use_
`;
}

// ═══════════════════════════════════════════════════════════════
//                    HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function isAdmin(groupId, oderId) {
    try {
        const meta = await sock.groupMetadata(groupId);
        const member = meta.participants.find(p => p.id === oderId);
        return member?.admin === 'admin' || member?.admin === 'superadmin';
    } catch { return false; }
}

async function isBotAdmin(groupId) {
    try {
        const meta = await sock.groupMetadata(groupId);
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const bot = meta.participants.find(p => p.id === botId);
        return bot?.admin === 'admin' || bot?.admin === 'superadmin';
    } catch { return false; }
}

function getMentioned(msg) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted && !mentioned.includes(quoted)) mentioned.push(quoted);
    return mentioned;
}

function getSetting(gid, key) {
    return groupSettings.get(gid)?.[key] || false;
}

function setSetting(gid, key, val) {
    if (!groupSettings.has(gid)) groupSettings.set(gid, {});
    groupSettings.get(gid)[key] = val;
}

// ═══════════════════════════════════════════════════════════════
//                    START BOT
// ═══════════════════════════════════════════════════════════════

async function startBot() {
    connectionStatus = 'connecting';
    
    try {
        if (!fs.existsSync(AUTH_FOLDER)) {
            fs.mkdirSync(AUTH_FOLDER, { recursive: true });
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        const { version } = await fetchLatestBaileysVersion();
        
        console.log('\n🔄 Starting bot...\n');
        
        sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: true,
            auth: state,
            browser: ['Ubuntu', 'Chrome', '120.0.0'],
            connectTimeoutMs: 60000,
            qrTimeout: 40000,
            defaultQueryTimeoutMs: 60000,
            syncFullHistory: false
        });
        
        // ═══════ CONNECTION HANDLER ═══════
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('\n📱 QR Code ready! Scan it or use pairing code.\n');
                connectionStatus = 'qr';
                qrImageData = await QRCode.toDataURL(qr, { width: 300 });
                
                // Auto request pairing code
                await delay(3000);
                if (!sock.authState?.creds?.registered) {
                    try {
                        pairingCode = await sock.requestPairingCode(config.ownerNumber);
                        console.log(`\n🔐 PAIRING CODE: ${pairingCode}\n`);
                        console.log(`   Enter this code in WhatsApp to connect!\n`);
                    } catch (e) {
                        console.log('⚠️ Could not get pairing code:', e.message);
                        console.log('   Use QR code instead.\n');
                    }
                }
            }
            
            if (connection === 'close') {
                const code = lastDisconnect?.error?.output?.statusCode;
                console.log(`\n❌ Disconnected (${code})\n`);
                
                qrImageData = null;
                pairingCode = null;
                connectionStatus = 'disconnected';
                
                const shouldReconnect = code !== DisconnectReason.loggedOut && 
                                        code !== 401 && code !== 403 && code !== 405;
                
                if (!shouldReconnect) {
                    console.log('🗑️ Session invalid, clearing...\n');
                    clearAuth();
                }
                
                retryCount++;
                if (retryCount > 5) {
                    clearAuth();
                    retryCount = 0;
                }
                
                setTimeout(startBot, 3000);
            }
            
            if (connection === 'open') {
                console.log('\n✅ BOT CONNECTED SUCCESSFULLY!\n');
                connectionStatus = 'connected';
                qrImageData = null;
                pairingCode = null;
                retryCount = 0;
                
                // Welcome message
                try {
                    await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                        text: `✅ *${config.botName} Connected!*\n\n⏰ ${getTime()}\n📅 ${getFullDate()}\n\n📸 ViewOnce Saver: ON\n👑 Admin Commands: ON\n\nType *${config.prefix}menu* for commands`
                    });
                } catch (e) {
                    console.log('Could not send welcome:', e.message);
                }
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
        // ═══════════════════════════════════════════════════════════════
        //                    MESSAGE HANDLER
        // ═══════════════════════════════════════════════════════════════
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                // Process all message types
                const msg = messages[0];
                if (!msg) return;
                if (!msg.message) return;
                if (msg.key.fromMe) return;
                
                const from = msg.key.remoteJid;
                if (!from) return;
                if (from === 'status@broadcast') return;
                
                const sender = msg.key.participant || from;
                const senderNum = sender.split('@')[0];
                const pushName = msg.pushName || 'User';
                const isGroup = from.endsWith('@g.us');
                const isOwner = senderNum === config.ownerNumber;
                
                // ═══════ GET MESSAGE CONTENT ═══════
                const msgType = Object.keys(msg.message).find(k => 
                    k !== 'messageContextInfo' && 
                    k !== 'senderKeyDistributionMessage'
                );
                
                // ═══════════════════════════════════════════════════════════════
                //                    VIEW ONCE SAVER (FIXED)
                // ═══════════════════════════════════════════════════════════════
                
                if (msgType === 'viewOnceMessageV2' || msgType === 'viewOnceMessage') {
                    console.log(`\n📸 VIEW ONCE from ${pushName} (${senderNum})!\n`);
                    
                    if (config.saveViewOnce) {
                        try {
                            const viewOnce = msg.message.viewOnceMessageV2?.message || 
                                           msg.message.viewOnceMessage?.message;
                            
                            if (!viewOnce) {
                                console.log('❌ Could not extract viewOnce content');
                                return;
                            }
                            
                            const mediaType = Object.keys(viewOnce).find(k => 
                                k.includes('image') || k.includes('video') || k.includes('audio')
                            );
                            
                            if (!mediaType) {
                                console.log('❌ Unknown media type in viewOnce');
                                return;
                            }
                            
                            console.log(`📥 Downloading ${mediaType}...`);
                            
                            const buffer = await downloadMediaMessage(
                                { message: viewOnce },
                                'buffer',
                                {},
                                {
                                    logger: pino({ level: 'silent' }),
                                    reuploadRequest: sock.updateMediaMessage
                                }
                            );
                            
                            if (!buffer || buffer.length === 0) {
                                console.log('❌ Download failed - empty buffer');
                                return;
                            }
                            
                            console.log(`✅ Downloaded! Size: ${buffer.length} bytes`);
                            
                            const caption = `╔══════════════════════════╗
║  📸 *VIEW ONCE SAVED!*   ║
╠══════════════════════════╣
║ 👤 From: ${pushName}
║ 📱 Number: ${senderNum}
║ ${isGroup ? '👥 Group: ' + (await sock.groupMetadata(from).catch(() => ({subject:'Unknown'}))).subject : '💬 Private Chat'}
║ ⏰ ${getTime()}
║ 📅 ${getDate()}
╚══════════════════════════╝`;
                            
                            const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                            
                            if (mediaType.includes('image')) {
                                await sock.sendMessage(ownerJid, { image: buffer, caption });
                                console.log('✅ Image sent to owner!');
                            } else if (mediaType.includes('video')) {
                                await sock.sendMessage(ownerJid, { video: buffer, caption });
                                console.log('✅ Video sent to owner!');
                            } else if (mediaType.includes('audio')) {
                                await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
                                await sock.sendMessage(ownerJid, { text: caption });
                                console.log('✅ Audio sent to owner!');
                            }
                            
                        } catch (e) {
                            console.log('❌ ViewOnce save error:', e.message);
                        }
                    }
                    return;
                }
                
                // ═══════ GET TEXT BODY ═══════
                let body = '';
                
                if (msg.message.conversation) {
                    body = msg.message.conversation;
                } else if (msg.message.extendedTextMessage?.text) {
                    body = msg.message.extendedTextMessage.text;
                } else if (msg.message.imageMessage?.caption) {
                    body = msg.message.imageMessage.caption;
                } else if (msg.message.videoMessage?.caption) {
                    body = msg.message.videoMessage.caption;
                } else if (msg.message.documentMessage?.caption) {
                    body = msg.message.documentMessage.caption;
                } else if (msg.message.ephemeralMessage?.message?.extendedTextMessage?.text) {
                    body = msg.message.ephemeralMessage.message.extendedTextMessage.text;
                } else if (msg.message.ephemeralMessage?.message?.conversation) {
                    body = msg.message.ephemeralMessage.message.conversation;
                }
                
                body = body?.trim() || '';
                
                // Debug log
                if (body) {
                    console.log(`📩 ${pushName}: ${body.slice(0, 50)}`);
                }
                
                // ═══════ ANTILINK CHECK ═══════
                if (isGroup && getSetting(from, 'antilink') && !await isAdmin(from, sender)) {
                    if (body.includes('chat.whatsapp.com/')) {
                        try {
                            await sock.sendMessage(from, { delete: msg.key });
                            await sock.sendMessage(from, { 
                                text: `⚠️ @${senderNum} links are not allowed!`,
                                mentions: [sender]
                            });
                        } catch {}
                        return;
                    }
                }
                
                // ═══════ COMMAND CHECK ═══════
                if (!body.startsWith(config.prefix)) return;
                
                const args = body.slice(config.prefix.length).trim().split(/ +/);
                const cmd = args.shift().toLowerCase();
                
                console.log(`⚡ CMD: ${cmd} | Args: ${args.join(' ') || 'none'}`);
                
                // React loading
                await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } }).catch(() => {});
                
                let reply = '';
                
                try {
                    switch (cmd) {
                        
                        // ═══════ MAIN ═══════
                        case 'menu':
                        case 'help':
                            reply = getMenu();
                            break;
                        
                        case 'ping':
                            const start = Date.now();
                            reply = `🏓 Pong! ${Date.now() - start}ms`;
                            break;
                        
                        case 'owner':
                            reply = `👑 *Owner:* ${config.ownerName}\n📱 wa.me/${config.ownerNumber}`;
                            break;
                        
                        case 'runtime':
                        case 'uptime':
                            reply = `⏱️ *Uptime:* ${runtime(process.uptime())}`;
                            break;
                        
                        // ═══════ GROUP ═══════
                        case 'tagall':
                        case 'all':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            try {
                                const meta = await sock.groupMetadata(from);
                                const members = meta.participants.map(p => p.id);
                                let txt = `📢 *TAG ALL* (${members.length})\n\n`;
                                members.forEach(m => txt += `@${m.split('@')[0]} `);
                                if (args.length) txt += `\n\n📝 ${args.join(' ')}`;
                                await sock.sendMessage(from, { text: txt, mentions: members }, { quoted: msg });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'hidetag':
                        case 'h':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!args.length) { reply = `❌ Usage: ${config.prefix}hidetag message`; break; }
                            try {
                                const meta = await sock.groupMetadata(from);
                                const members = meta.participants.map(p => p.id);
                                await sock.sendMessage(from, { text: args.join(' '), mentions: members });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'groupinfo':
                        case 'ginfo':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            try {
                                const g = await sock.groupMetadata(from);
                                const admins = g.participants.filter(p => p.admin).length;
                                reply = `👥 *${g.subject}*\n\n` +
                                    `📊 Members: ${g.participants.length}\n` +
                                    `👑 Admins: ${admins}\n` +
                                    `📅 Created: ${moment(g.creation * 1000).format('DD/MM/YYYY')}\n` +
                                    `📝 ${g.desc || 'No description'}`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'admins':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            try {
                                const g = await sock.groupMetadata(from);
                                const admins = g.participants.filter(p => p.admin);
                                let txt = `👑 *Admins (${admins.length}):*\n\n`;
                                admins.forEach((a, i) => txt += `${i+1}. @${a.id.split('@')[0]}\n`);
                                await sock.sendMessage(from, { text: txt, mentions: admins.map(a => a.id) }, { quoted: msg });
                                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                                return;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'link':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            try {
                                const code = await sock.groupInviteCode(from);
                                reply = `🔗 https://chat.whatsapp.com/${code}`;
                            } catch { reply = '❌ Bot needs admin!'; }
                            break;
                        
                        case 'revoke':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            try {
                                await sock.groupRevokeInvite(from);
                                const code = await sock.groupInviteCode(from);
                                reply = `✅ Link reset!\n🔗 https://chat.whatsapp.com/${code}`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        // ═══════ ADMIN ═══════
                        case 'kick':
                        case 'remove':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            const kickTarget = getMentioned(msg)[0];
                            if (!kickTarget) { reply = '❌ Tag someone!'; break; }
                            try {
                                await sock.groupParticipantsUpdate(from, [kickTarget], 'remove');
                                reply = `✅ Removed @${kickTarget.split('@')[0]}`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'add':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            if (!args[0]) { reply = '❌ Provide number!'; break; }
                            const addNum = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
                            try {
                                await sock.groupParticipantsUpdate(from, [addNum], 'add');
                                reply = `✅ Added!`;
                            } catch { reply = '❌ Failed! Check number.'; }
                            break;
                        
                        case 'promote':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            const promoteTarget = getMentioned(msg)[0];
                            if (!promoteTarget) { reply = '❌ Tag someone!'; break; }
                            try {
                                await sock.groupParticipantsUpdate(from, [promoteTarget], 'promote');
                                reply = `✅ @${promoteTarget.split('@')[0]} is now admin! 👑`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'demote':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            const demoteTarget = getMentioned(msg)[0];
                            if (!demoteTarget) { reply = '❌ Tag someone!'; break; }
                            try {
                                await sock.groupParticipantsUpdate(from, [demoteTarget], 'demote');
                                reply = `✅ @${demoteTarget.split('@')[0]} removed from admin`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'mute':
                        case 'close':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            try {
                                await sock.groupSettingUpdate(from, 'announcement');
                                reply = '🔒 Group closed! Admins only can chat.';
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'unmute':
                        case 'open':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            try {
                                await sock.groupSettingUpdate(from, 'not_announcement');
                                reply = '🔓 Group opened! Everyone can chat.';
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'setname':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            if (!args.length) { reply = '❌ Provide name!'; break; }
                            try {
                                await sock.groupUpdateSubject(from, args.join(' '));
                                reply = `✅ Name changed to: ${args.join(' ')}`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'setdesc':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (!await isBotAdmin(from)) { reply = '❌ Bot needs admin!'; break; }
                            if (!args.length) { reply = '❌ Provide description!'; break; }
                            try {
                                await sock.groupUpdateDescription(from, args.join(' '));
                                reply = '✅ Description updated!';
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'antilink':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (args[0] === 'on') {
                                setSetting(from, 'antilink', true);
                                reply = '✅ Antilink ON!';
                            } else if (args[0] === 'off') {
                                setSetting(from, 'antilink', false);
                                reply = '✅ Antilink OFF!';
                            } else {
                                reply = `🔗 Antilink: ${getSetting(from, 'antilink') ? 'ON' : 'OFF'}\n\nUsage: ${config.prefix}antilink on/off`;
                            }
                            break;
                        
                        case 'welcome':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (args[0] === 'on') {
                                setSetting(from, 'welcome', true);
                                reply = '✅ Welcome ON!';
                            } else if (args[0] === 'off') {
                                setSetting(from, 'welcome', false);
                                reply = '✅ Welcome OFF!';
                            } else {
                                reply = `👋 Welcome: ${getSetting(from, 'welcome') ? 'ON' : 'OFF'}\n\nUsage: ${config.prefix}welcome on/off`;
                            }
                            break;
                        
                        case 'goodbye':
                        case 'bye':
                            if (!isGroup) { reply = '❌ Groups only!'; break; }
                            if (!await isAdmin(from, sender) && !isOwner) { reply = '❌ Admins only!'; break; }
                            if (args[0] === 'on') {
                                setSetting(from, 'goodbye', true);
                                reply = '✅ Goodbye ON!';
                            } else if (args[0] === 'off') {
                                setSetting(from, 'goodbye', false);
                                reply = '✅ Goodbye OFF!';
                            } else {
                                reply = `👋 Goodbye: ${getSetting(from, 'goodbye') ? 'ON' : 'OFF'}\n\nUsage: ${config.prefix}goodbye on/off`;
                            }
                            break;
                        
                        // ═══════ OWNER ═══════
                        case 'join':
                            if (!isOwner) { reply = '❌ Owner only!'; break; }
                            if (!args[0]) { reply = '❌ Provide link!'; break; }
                            try {
                                const code = args[0].split('chat.whatsapp.com/')[1];
                                if (!code) { reply = '❌ Invalid link!'; break; }
                                await sock.groupAcceptInvite(code);
                                reply = '✅ Joined!';
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'leave':
                            if (!isOwner) { reply = '❌ Owner only!'; break; }
                            if (!isGroup) { reply = '❌ Use in group!'; break; }
                            await sock.sendMessage(from, { text: '👋 Goodbye!' });
                            await sock.groupLeave(from);
                            return;
                        
                        case 'block':
                            if (!isOwner) { reply = '❌ Owner only!'; break; }
                            const blockTarget = getMentioned(msg)[0] || (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);
                            if (!blockTarget) { reply = '❌ Tag or provide number!'; break; }
                            try {
                                await sock.updateBlockStatus(blockTarget, 'block');
                                reply = `✅ Blocked!`;
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        case 'unblock':
                            if (!isOwner) { reply = '❌ Owner only!'; break; }
                            if (!args[0]) { reply = '❌ Provide number!'; break; }
                            try {
                                await sock.updateBlockStatus(args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net', 'unblock');
                                reply = '✅ Unblocked!';
                            } catch { reply = '❌ Failed!'; }
                            break;
                        
                        default:
                            reply = `❌ Unknown: *${cmd}*\n\nType *${config.prefix}menu*`;
                    }
                    
                } catch (e) {
                    console.log('Command error:', e.message);
                    reply = `❌ Error: ${e.message}`;
                }
                
                // Send reply
                if (reply) {
                    await sock.sendMessage(from, { text: reply }, { quoted: msg });
                }
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } }).catch(() => {});
                
            } catch (e) {
                console.log('Handler error:', e.message);
            }
        });
        
        // ═══════ GROUP EVENTS ═══════
        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            try {
                if (action === 'add' && getSetting(id, 'welcome')) {
                    const meta = await sock.groupMetadata(id);
                    for (const p of participants) {
                        await sock.sendMessage(id, {
                            text: `👋 Welcome @${p.split('@')[0]} to *${meta.subject}*!\n\n👥 Member #${meta.participants.length}`,
                            mentions: [p]
                        });
                    }
                }
                
                if (action === 'remove' && getSetting(id, 'goodbye')) {
                    for (const p of participants) {
                        await sock.sendMessage(id, {
                            text: `👋 Goodbye @${p.split('@')[0]}!\n\nWe'll miss you! 😢`,
                            mentions: [p]
                        });
                    }
                }
            } catch (e) {
                console.log('Group event error:', e.message);
            }
        });
        
    } catch (e) {
        console.log('Start error:', e.message);
        connectionStatus = 'disconnected';
        retryCount++;
        setTimeout(startBot, 5000);
    }
}

// ═══════════════════════════════════════════════════════════════
//                    START
// ═══════════════════════════════════════════════════════════════

console.log(`
╔═══════════════════════════════════════╗
║  🤖 ${config.botName}
║  👑 Owner: ${config.ownerName}
║  📱 Number: ${config.ownerNumber}
╠═══════════════════════════════════════╣
║  📸 ViewOnce Saver: ✅ ON
║  👑 Admin Commands: ✅ Ready
║  👥 Group Tools: ✅ Ready
╚═══════════════════════════════════════╝
`);

startBot();
