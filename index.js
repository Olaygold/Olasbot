
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    makeInMemoryStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const axios = require('axios');
const express = require('express');
const readline = require('readline');
const config = require('./config');
const commands = require('./commands/handler');
const func = require('./lib/functions');

// ═══════════════════════════════════════════════════════════════
//                    OLAYINKA BOT - MAIN FILE
//                    WITH PAIRING CODE SUPPORT
// ═══════════════════════════════════════════════════════════════

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

// Store pairing code for web display
let currentPairingCode = null;
let connectionStatus = 'waiting';

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>${config.botName}</title>
                <meta http-equiv="refresh" content="10">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                        color: white;
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: rgba(255,255,255,0.05);
                        border-radius: 30px;
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255,255,255,0.1);
                        box-shadow: 0 25px 50px rgba(0,0,0,0.3);
                        max-width: 500px;
                        width: 90%;
                    }
                    .logo { font-size: 80px; margin-bottom: 20px; }
                    h1 { 
                        font-size: 2.5em; 
                        margin-bottom: 10px;
                        background: linear-gradient(90deg, #00ff88, #00d4ff);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }
                    .owner { opacity: 0.7; margin-bottom: 30px; }
                    .status-box {
                        padding: 20px;
                        border-radius: 15px;
                        margin: 20px 0;
                    }
                    .waiting { background: rgba(255,193,7,0.2); border: 2px solid #ffc107; }
                    .connected { background: rgba(0,255,136,0.2); border: 2px solid #00ff88; }
                    .pairing-code {
                        font-size: 3em;
                        font-weight: bold;
                        letter-spacing: 8px;
                        color: #00ff88;
                        padding: 20px;
                        background: rgba(0,0,0,0.3);
                        border-radius: 15px;
                        margin: 20px 0;
                        font-family: monospace;
                    }
                    .instructions {
                        text-align: left;
                        background: rgba(0,0,0,0.2);
                        padding: 20px;
                        border-radius: 15px;
                        margin-top: 20px;
                    }
                    .instructions h3 { color: #00d4ff; margin-bottom: 15px; }
                    .instructions ol { padding-left: 20px; }
                    .instructions li { margin: 10px 0; opacity: 0.9; }
                    .refresh { 
                        opacity: 0.5; 
                        font-size: 0.9em; 
                        margin-top: 20px; 
                    }
                    .pulse {
                        animation: pulse 2s infinite;
                    }
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
                    <p class="owner">by ${config.ownerName}</p>
                    
                    ${connectionStatus === 'connected' ? `
                        <div class="status-box connected">
                            <h2>✅ BOT CONNECTED!</h2>
                            <p>Your bot is now online and working</p>
                        </div>
                    ` : currentPairingCode ? `
                        <div class="status-box waiting">
                            <h2>📱 Enter This Code in WhatsApp</h2>
                        </div>
                        <div class="pairing-code">${currentPairingCode}</div>
                        <div class="instructions">
                            <h3>📋 How to Connect:</h3>
                            <ol>
                                <li>Open <strong>WhatsApp</strong> on your phone</li>
                                <li>Go to <strong>Settings</strong> (3 dots menu)</li>
                                <li>Tap <strong>Linked Devices</strong></li>
                                <li>Tap <strong>Link a Device</strong></li>
                                <li>Tap <strong>Link with phone number instead</strong></li>
                                <li>Enter your phone number</li>
                                <li>Enter the code: <strong>${currentPairingCode}</strong></li>
                            </ol>
                        </div>
                    ` : `
                        <div class="status-box waiting">
                            <h2 class="pulse">⏳ Generating Pairing Code...</h2>
                            <p>Please wait a moment</p>
                        </div>
                    `}
                    
                    <p class="refresh">Page auto-refreshes every 10 seconds</p>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🌐 Server running on port ${PORT}`);
});

// Store
const store = makeInMemoryStore({ 
    logger: pino().child({ level: 'silent', stream: 'store' }) 
});

// Readline for pairing code input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(text) {
    return new Promise((resolve) => rl.question(text, resolve));
}

// Start Bot Function
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Disable QR in terminal
        auth: state,
        browser: ['Olayinka Bot', 'Chrome', '1.0.0']
    });

    store.bind(sock.ev);

    // Request pairing code if not registered
    if (!sock.authState.creds.registered) {
        console.log('\n╔════════════════════════════════════════════╗');
        console.log('║      📱 PAIRING CODE CONNECTION            ║');
        console.log('╠════════════════════════════════════════════╣');
        console.log('║                                            ║');
        console.log('║  Your phone number from config.js:         ║');
        console.log(`║  ${config.ownerNumber}                      `);
        console.log('║                                            ║');
        console.log('╚════════════════════════════════════════════╝\n');

        // Wait a moment for connection
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
            // Request pairing code
            const code = await sock.requestPairingCode(config.ownerNumber);
            currentPairingCode = code;
            
            console.log('\n╔════════════════════════════════════════════╗');
            console.log('║         🔐 YOUR PAIRING CODE 🔐            ║');
            console.log('╠════════════════════════════════════════════╣');
            console.log('║                                            ║');
            console.log(`║           ${code}                    `);
            console.log('║                                            ║');
            console.log('╠════════════════════════════════════════════╣');
            console.log('║  📱 How to use:                            ║');
            console.log('║  1. Open WhatsApp                          ║');
            console.log('║  2. Go to Linked Devices                   ║');
            console.log('║  3. Tap "Link a Device"                    ║');
            console.log('║  4. Tap "Link with phone number instead"   ║');
            console.log('║  5. Enter your phone number                ║');
            console.log('║  6. Enter the code above                   ║');
            console.log('║                                            ║');
            console.log('║  🌐 Or visit your Render URL to see code   ║');
            console.log('╚════════════════════════════════════════════╝\n');
            
        } catch (err) {
            console.log('❌ Error getting pairing code:', err.message);
        }
    }

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Connection update
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
            currentPairingCode = null;
            connectionStatus = 'waiting';
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            currentPairingCode = null;
            
            console.log('\n╔════════════════════════════════════════════╗');
            console.log('║                                            ║');
            console.log(`║   ✅ ${config.botName} CONNECTED!          `);
            console.log('║                                            ║');
            console.log(`║   👑 Owner: ${config.ownerName}                     `);
            console.log('║   📱 Bot is now online!                    ║');
            console.log('║   🤖 AI Auto-Reply: ON                     ║');
            console.log('║   📸 View Once Saver: ON                   ║');
            console.log('║                                            ║');
            console.log('╚════════════════════════════════════════════╝\n');
            
            // Send connection message to owner
            try {
                await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                    text: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${config.botName}* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

✅ *Bot Connected Successfully!*

⏰ *Time:* ${func.getTime()}
📅 *Date:* ${func.getDate()}

*Features Active:*
━━━━━━━━━━━━━━━━━━
• 🧠 AI Auto-Reply
• 📸 View Once Saver
• 🎮 50+ Commands

Type *${config.prefix}menu* to see all commands!

_${config.footer}_`
                });
            } catch (e) {
                console.log('Could not send welcome message');
            }
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            if (msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderNumber = sender.split('@')[0];
            const isGroup = from.endsWith('@g.us');
            const isOwner = senderNumber === config.ownerNumber;
            
            const type = Object.keys(msg.message)[0];
            const body = 
                type === 'conversation' ? msg.message.conversation :
                type === 'extendedTextMessage' ? msg.message.extendedTextMessage.text :
                type === 'imageMessage' ? msg.message.imageMessage.caption :
                type === 'videoMessage' ? msg.message.videoMessage.caption : '';

            // ═══════════════════════════════════════
            //         VIEW ONCE HANDLER
            // ═══════════════════════════════════════
            
            if (type === 'viewOnceMessageV2' || type === 'viewOnceMessage') {
                if (!config.saveViewOnce) return;
                
                console.log('📸 View Once detected! Saving...');
                
                try {
                    const viewOnceMsg = msg.message.viewOnceMessageV2 || msg.message.viewOnceMessage;
                    const mediaType = Object.keys(viewOnceMsg.message)[0];
                    
                    const buffer = await downloadMediaMessage(
                        { message: viewOnceMsg.message },
                        'buffer',
                        {}
                    );
                    
                    let pushName = msg.pushName || 'Unknown';
                    
                    const caption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📸 *VIEW ONCE SAVED* 📸
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *From:* ${pushName}
📱 *Number:* ${senderNumber}
⏰ *Time:* ${func.getTime()}
📅 *Date:* ${func.getDate()}
${isGroup ? `👥 *Group:* Yes` : '📩 *Chat:* Private'}

_Saved by ${config.botName}_ 🤖

_${config.footer}_`;
                    
                    const ownerJid = config.ownerNumber + '@s.whatsapp.net';
                    
                    if (mediaType.includes('image')) {
                        await sock.sendMessage(ownerJid, {
                            image: buffer,
                            caption: caption
                        });
                    } else if (mediaType.includes('video')) {
                        await sock.sendMessage(ownerJid, {
                            video: buffer,
                            caption: caption
                        });
                    } else if (mediaType.includes('audio')) {
                        await sock.sendMessage(ownerJid, {
                            audio: buffer,
                            mimetype: 'audio/mp4',
                            ptt: true
                        });
                        await sock.sendMessage(ownerJid, { text: caption });
                    }
                    
                    console.log('✅ View Once saved and sent to owner!');
                    
                } catch (err) {
                    console.log('❌ View Once Error:', err.message);
                }
                
                return;
            }

            // ═══════════════════════════════════════
            //          COMMAND HANDLER
            // ═══════════════════════════════════════
            
            if (body.startsWith(config.prefix)) {
                const args = body.slice(config.prefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();
                
                console.log(`📩 Command: ${command} from ${senderNumber}`);
                
                if (commands[command]) {
                    try {
                        await sock.sendMessage(from, { 
                            react: { text: '⏳', key: msg.key } 
                        });
                        
                        const result = await commands[command](sock, msg, args);
                        
                        if (typeof result === 'string') {
                            await sock.sendMessage(from, { text: result }, { quoted: msg });
                        } else if (result && result.type === 'meme') {
                            try {
                                const memeRes = await axios.get('https://meme-api.com/gimme');
                                await sock.sendMessage(from, {
                                    image: { url: memeRes.data.url },
                                    caption: `😂 *${memeRes.data.title}*\n\n_${config.footer}_`
                                }, { quoted: msg });
                            } catch {
                                await sock.sendMessage(from, { text: '❌ Failed to get meme!' }, { quoted: msg });
                            }
                        } else if (result && result.type === 'cat') {
                            try {
                                const catRes = await axios.get('https://api.thecatapi.com/v1/images/search');
                                await sock.sendMessage(from, {
                                    image: { url: catRes.data[0].url },
                                    caption: `🐱 *Meow!*\n\n_${config.footer}_`
                                }, { quoted: msg });
                            } catch {
                                await sock.sendMessage(from, { text: '❌ Failed to get cat image!' }, { quoted: msg });
                            }
                        } else if (result && result.type === 'dog') {
                            try {
                                const dogRes = await axios.get('https://dog.ceo/api/breeds/image/random');
                                await sock.sendMessage(from, {
                                    image: { url: dogRes.data.message },
                                    caption: `🐕 *Woof!*\n\n_${config.footer}_`
                                }, { quoted: msg });
                            } catch {
                                await sock.sendMessage(from, { text: '❌ Failed to get dog image!' }, { quoted: msg });
                            }
                        }
                        
                        await sock.sendMessage(from, { 
                            react: { text: '✅', key: msg.key } 
                        });
                        
                    } catch (err) {
                        console.log('Command Error:', err);
                        await sock.sendMessage(from, { 
                            react: { text: '❌', key: msg.key } 
                        });
                    }
                } else {
                    await sock.sendMessage(from, {
                        text: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ❌ *UNKNOWN COMMAND*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Command *${command}* not found!

💡 Type *${config.prefix}menu* to see
all available commands.

_${config.footer}_`
                    }, { quoted: msg });
                }
                
                return;
            }

            // ═══════════════════════════════════════
            //          AI AUTO RESPONSE
            // ═══════════════════════════════════════
            
            if (config.autoAI && body.trim()) {
                if (isGroup) return;
                
                console.log(`🤖 AI responding to: ${body.slice(0, 50)}...`);
                
                try {
                    await sock.sendPresenceUpdate('composing', from);
                    
                    const aiResponse = await func.aiChat(body);
                    
                    await sock.sendMessage(from, {
                        text: `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${config.botName}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯

${aiResponse}

━━━━━━━━━━━━━━━━━━━━━━━━

💡 _Type ${config.prefix}menu for commands_

_${config.footer}_`
                    }, { quoted: msg });
                    
                } catch (err) {
                    console.log('AI Error:', err);
                }
            }

        } catch (err) {
            console.log('Error:', err);
        }
    });

    return sock;
}

// Start the bot
console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║     🤖 ${config.botName.toUpperCase()} 🤖
║                                           ║
║     👑 Owner: ${config.ownerName}
║     📱 Starting...                        
║                                           ║
╚═══════════════════════════════════════════╝
`);

startBot();
