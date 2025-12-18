const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason,
    downloadMediaMessage,
    makeInMemoryStore,
    jidDecode
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const axios = require('axios');
const express = require('express');
const config = require('./config');
const commands = require('./commands/handler');
const func = require('./lib/functions');

// ═══════════════════════════════════════════════════════════════
//                    OLAYINKA BOT - MAIN FILE
// ═══════════════════════════════════════════════════════════════

// Express server for Render
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>${config.botName}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        padding: 40px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 3em; margin: 0; }
                    p { font-size: 1.2em; opacity: 0.9; }
                    .status { 
                        display: inline-block;
                        padding: 10px 20px;
                        background: #00ff88;
                        color: black;
                        border-radius: 50px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🤖 ${config.botName}</h1>
                    <p>WhatsApp Bot by ${config.ownerName}</p>
                    <div class="status">✅ ONLINE</div>
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

// Start Bot Function
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: state,
        browser: ['Olayinka Bot', 'Chrome', '1.0.0']
    });

    store.bind(sock.ev);

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Connection update
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n╔════════════════════════════════════╗');
            console.log('║     📱 SCAN QR CODE ABOVE 📱       ║');
            console.log('║     Open WhatsApp > Linked Devices ║');
            console.log('╚════════════════════════════════════╝\n');
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('\n╔════════════════════════════════════╗');
            console.log(`║   ✅ ${config.botName} CONNECTED!    ║`);
            console.log(`║   👑 Owner: ${config.ownerName}              ║`);
            console.log('╚════════════════════════════════════╝\n');
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message) return;
            if (msg.key.fromMe) return; // Ignore own messages

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderNumber = sender.split('@')[0];
            const isGroup = from.endsWith('@g.us');
            const isOwner = senderNumber === config.ownerNumber;
            
            // Get message content
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
                    const mediaMsg = viewOnceMsg.message[mediaType];
                    
                    // Download media
                    const buffer = await downloadMediaMessage(
                        { message: viewOnceMsg.message },
                        'buffer',
                        {}
                    );
                    
                    // Get sender name
                    let pushName = msg.pushName || 'Unknown';
                    
                    // Caption for saved media
                    const caption = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📸 *VIEW ONCE SAVED* 📸
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *From:* ${pushName}
📱 *Number:* ${senderNumber}
⏰ *Time:* ${func.getTime()}
📅 *Date:* ${func.getDate()}
${isGroup ? `👥 *Group:* ${from.split('@')[0]}` : ''}

_Saved by ${config.botName}_ 🤖

_${config.footer}_`;
                    
                    // Send to owner's personal chat
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
                
                // Check if command exists
                if (commands[command]) {
                    try {
                        // React to message
                        await sock.sendMessage(from, { 
                            react: { text: '⏳', key: msg.key } 
                        });
                        
                        const result = await commands[command](sock, msg, args);
                        
                        // Handle different result types
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
                        
                        // Success reaction
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
                    // Unknown command
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
                // Don't reply in groups unless mentioned
                if (isGroup) return;
                
                console.log(`🤖 AI responding to: ${body.slice(0, 50)}...`);
                
                try {
                    // Show typing indicator
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
║     🤖 ${config.botName.toUpperCase()} 🤖              ║
║                                           ║
║     👑 Owner: ${config.ownerName}                  ║
║     📱 Starting...                        ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

startBot();
