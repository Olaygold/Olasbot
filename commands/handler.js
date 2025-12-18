const config = require('../config');
const func = require('../lib/functions');

// ═══════════════════════════════════════════════════════════════
//                    COMMAND HANDLER
// ═══════════════════════════════════════════════════════════════

const commands = {
    
    // ═══════════════════════════════════════
    //            MAIN COMMANDS
    // ═══════════════════════════════════════
    
    menu: async (sock, msg, args) => {
        const menuText = `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *${config.botName.toUpperCase()}* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━ *${func.getGreeting()}* ━━━┓

👤 *Owner:* ${config.ownerName}
📅 *Date:* ${func.getDate()}
⏰ *Time:* ${func.getTime()}

┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📋 *MAIN MENU*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}menu - Show this menu
│ ${config.prefix}help - Get help
│ ${config.prefix}owner - Contact owner
│ ${config.prefix}ping - Check bot speed
│ ${config.prefix}runtime - Bot uptime
│ ${config.prefix}about - About bot
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🧠 *AI COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}ai <question> - Ask AI
│ ${config.prefix}gpt <question> - ChatGPT
│ ${config.prefix}think <topic> - Deep think
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🎮 *FUN COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}joke - Random joke
│ ${config.prefix}quote - Inspirational quote
│ ${config.prefix}fact - Random fact
│ ${config.prefix}dare - Get a dare
│ ${config.prefix}truth - Get a truth question
│ ${config.prefix}8ball <question> - Magic 8 ball
│ ${config.prefix}roll - Roll dice
│ ${config.prefix}flip - Flip coin
│ ${config.prefix}rate <name> - Rate something
│ ${config.prefix}ship <name1> <name2> - Love match
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🔧 *TOOLS COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}weather <city> - Get weather
│ ${config.prefix}calc <math> - Calculator
│ ${config.prefix}translate <text> - Translate
│ ${config.prefix}define <word> - Dictionary
│ ${config.prefix}lyrics <song> - Find lyrics
│ ${config.prefix}shorturl <url> - Shorten URL
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🖼️ *MEDIA COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}sticker - Image to sticker
│ ${config.prefix}toimg - Sticker to image
│ ${config.prefix}blur - Blur image
│ ${config.prefix}meme - Random meme
│ ${config.prefix}cat - Cat image
│ ${config.prefix}dog - Dog image
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   👑 *OWNER COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}broadcast <msg> - Broadcast
│ ${config.prefix}block <@user> - Block user
│ ${config.prefix}unblock <@user> - Unblock
│ ${config.prefix}setname <name> - Set bot name
│ ${config.prefix}restart - Restart bot
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   👥 *GROUP COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}add <number> - Add member
│ ${config.prefix}kick <@user> - Kick member
│ ${config.prefix}promote <@user> - Make admin
│ ${config.prefix}demote <@user> - Remove admin
│ ${config.prefix}tagall - Tag everyone
│ ${config.prefix}groupinfo - Group info
│ ${config.prefix}setgroupname <name> - Set name
│ ${config.prefix}setdesc <desc> - Set description
│ ${config.prefix}mute - Mute group
│ ${config.prefix}unmute - Unmute group
│ ${config.prefix}link - Get group link
│ ${config.prefix}revoke - Reset group link
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📥 *DOWNLOAD COMMANDS*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
│ ${config.prefix}play <song> - Download song
│ ${config.prefix}video <title> - Download video
│ ${config.prefix}tiktok <url> - TikTok download
│ ${config.prefix}insta <url> - Instagram download
│ ${config.prefix}facebook <url> - FB download
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ℹ️ *INFORMATION*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📌 *Prefix:* ${config.prefix}
🤖 *Bot:* ${config.botName}
👑 *Owner:* ${config.ownerName}
🧠 *AI Mode:* ${config.autoAI ? 'ON' : 'OFF'}
📸 *View Once Saver:* ${config.saveViewOnce ? 'ON' : 'OFF'}

_Send any message without prefix_
_for AI auto-reply!_ 🤖

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

_${config.footer}_
`;
        return menuText;
    },

    // ═══════════════════════════════════════
    //            INFO COMMANDS
    // ═══════════════════════════════════════
    
    help: async () => {
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❓ *HELP CENTER* ❓
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👋 Hi! I'm *${config.botName}*!

*How to use me:*
━━━━━━━━━━━━━━━━━━
1️⃣ Type *${config.prefix}menu* to see all commands
2️⃣ Use prefix *${config.prefix}* before commands
3️⃣ Send any message for AI reply

*Examples:*
━━━━━━━━━━━━━━━━━━
• ${config.prefix}ai What is love?
• ${config.prefix}joke
• ${config.prefix}weather Lagos
• ${config.prefix}sticker (reply to image)

*Need more help?*
━━━━━━━━━━━━━━━━━━
Contact owner: ${config.prefix}owner

_${config.footer}_`;
    },
    
    owner: async () => {
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👑 *BOT OWNER* 👑
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *Name:* ${config.ownerName}
📱 *Number:* wa.me/${config.ownerNumber}
🤖 *Bot:* ${config.botName}

━━━━━━━━━━━━━━━━━━

_Feel free to contact for:_
• 🐛 Bug reports
• 💡 Suggestions
• 🤝 Collaboration
• ❓ Questions

_${config.footer}_`;
    },
    
    ping: async () => {
        const start = Date.now();
        await new Promise(r => setTimeout(r, 100));
        const end = Date.now();
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🏓 *PONG!* 🏓
╰━━━━━━━━━━━━━━━━━━━━━╯

⚡ *Response:* ${end - start}ms
📡 *Status:* Online
🤖 *Bot:* Active

_${config.footer}_`;
    },
    
    about: async () => {
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    ℹ️ *ABOUT BOT* ℹ️
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

🤖 *Name:* ${config.botName}
👑 *Owner:* ${config.ownerName}
📌 *Version:* 1.0.0
📅 *Created:* 2024
💻 *Platform:* Node.js

*Features:*
━━━━━━━━━━━━━━━━━━
✅ AI Auto-Reply
✅ View Once Saver
✅ Media Downloader
✅ Fun Commands
✅ Group Management
✅ 24/7 Online

*Powered by:*
━━━━━━━━━━━━━━━━━━
⚡ Baileys Library
🧠 Free AI APIs

_${config.footer}_`;
    },

    // ═══════════════════════════════════════
    //            AI COMMANDS
    // ═══════════════════════════════════════
    
    ai: async (sock, msg, args) => {
        if (!args.length) {
            return `
╭━━━━━━━━━━━━━━━━━━━━╮
┃    🧠 *AI CHAT* 🧠
╰━━━━━━━━━━━━━━━━━━━━╯

❌ *Please provide a question!*

📝 *Example:*
${config.prefix}ai What is the meaning of life?

_${config.footer}_`;
        }
        const response = await func.aiChat(args.join(' '));
        return `
╭━━━━━━━━━━━━━━━━━━━━╮
┃    🧠 *AI RESPONSE* 🧠
╰━━━━━━━━━━━━━━━━━━━━╯

${response}

_${config.footer}_`;
    },
    
    gpt: async (sock, msg, args) => {
        if (!args.length) {
            return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *ChatGPT* 🤖
╰━━━━━━━━━━━━━━━━━━━━━╯

❌ *Please provide a question!*

📝 *Example:*
${config.prefix}gpt Explain quantum physics

_${config.footer}_`;
        }
        const response = await func.aiChat(args.join(' '));
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃   🤖 *ChatGPT* 🤖
╰━━━━━━━━━━━━━━━━━━━━━╯

${response}

_${config.footer}_`;
    },

    // ═══════════════════════════════════════
    //            FUN COMMANDS
    // ═══════════════════════════════════════
    
    joke: async () => {
        const joke = await func.getJoke();
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    😂 *JOKE TIME* 😂
╰━━━━━━━━━━━━━━━━━━━━━╯

${joke}

_${config.footer}_`;
    },
    
    quote: async () => {
        const quote = await func.getQuote();
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   💭 *INSPIRATIONAL* 💭
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

${quote}

_${config.footer}_`;
    },
    
    fact: async () => {
        const facts = [
            "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs! 🍯",
            "Octopuses have three hearts and blue blood! 🐙",
            "A day on Venus is longer than its year! 🪐",
            "Bananas are berries, but strawberries aren't! 🍌",
            "The Eiffel Tower can grow up to 6 inches in summer due to heat! 🗼",
            "Cows have best friends and get stressed when separated! 🐄",
            "The shortest war in history lasted only 38-45 minutes! ⚔️",
            "Your brain uses 20% of your body's total energy! 🧠"
        ];
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃   📚 *RANDOM FACT* 📚
╰━━━━━━━━━━━━━━━━━━━━━╯

${func.pickRandom(facts)}

_${config.footer}_`;
    },
    
    dare: async () => {
        const dares = [
            "Send a voice note singing your favorite song! 🎤",
            "Change your profile picture to a meme for 1 hour! 😂",
            "Send 'I love you' to your last chat! ❤️",
            "Do 10 push-ups and send a video! 💪",
            "Speak in an accent for the next 5 messages! 🗣️",
            "Post an embarrassing photo on your status! 📸",
            "Call someone and sing happy birthday! 🎂",
            "Text your crush right now! 💕"
        ];
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🔥 *DARE* 🔥
╰━━━━━━━━━━━━━━━━━━━━━╯

${func.pickRandom(dares)}

_No chickening out!_ 😈

_${config.footer}_`;
    },
    
    truth: async () => {
        const truths = [
            "What's your biggest secret? 🤫",
            "Who was your first crush? 💕",
            "What's the most embarrassing thing you've done? 😳",
            "Have you ever lied to your best friend? 🤥",
            "What's your biggest fear? 😨",
            "Who do you secretly dislike? 😒",
            "What's the last lie you told? 🤔",
            "Have you ever cheated on a test? 📝"
        ];
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🎯 *TRUTH* 🎯
╰━━━━━━━━━━━━━━━━━━━━━╯

${func.pickRandom(truths)}

_Be honest!_ 😇

_${config.footer}_`;
    },
    
    "8ball": async (sock, msg, args) => {
        if (!args.length) {
            return "❌ Ask a question! Example: !8ball Will I be rich?";
        }
        const answers = [
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
            "My sources say yes 📚"
        ];
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🎱 *MAGIC 8 BALL* 🎱
╰━━━━━━━━━━━━━━━━━━━━━╯

❓ *Question:* ${args.join(' ')}

🎱 *Answer:* ${func.pickRandom(answers)}

_${config.footer}_`;
    },
    
    roll: async () => {
        const result = Math.floor(Math.random() * 6) + 1;
        const dice = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🎲 *DICE ROLL* 🎲
╰━━━━━━━━━━━━━━━━━━━━━╯

${dice[result - 1]}

*You rolled:* ${result}

_${config.footer}_`;
    },
    
    flip: async () => {
        const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        const emoji = result === 'HEADS' ? '👑' : '🔢';
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    🪙 *COIN FLIP* 🪙
╰━━━━━━━━━━━━━━━━━━━━━╯

${emoji}

*Result:* ${result}

_${config.footer}_`;
    },
    
    rate: async (sock, msg, args) => {
        if (!args.length) return "❌ Rate what? Example: !rate my looks";
        const rating = Math.floor(Math.random() * 101);
        let emoji = rating >= 80 ? '🔥' : rating >= 60 ? '😊' : rating >= 40 ? '😐' : '😢';
        return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃    ⭐ *RATING* ⭐
╰━━━━━━━━━━━━━━━━━━━━━╯

📊 *Rating:* ${args.join(' ')}

${emoji} *Score:* ${rating}/100

${'█'.repeat(Math.floor(rating/10))}${'░'.repeat(10 - Math.floor(rating/10))}

_${config.footer}_`;
    },
    
    ship: async (sock, msg, args) => {
        if (args.length < 2) return "❌ Need two names! Example: !ship John Mary";
        const percentage = Math.floor(Math.random() * 101);
        let status, emoji;
        if (percentage >= 80) { status = "Perfect Match! 💕"; emoji = "❤️🔥"; }
        else if (percentage >= 60) { status = "Great Couple! 💖"; emoji = "💕"; }
        else if (percentage >= 40) { status = "Could Work! 💝"; emoji = "💗"; }
        else if (percentage >= 20) { status = "Needs Effort 💔"; emoji = "💛"; }
        else { status = "Not Compatible 😬"; emoji = "💔"; }
        
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃    💕 *LOVE METER* 💕
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 *${args[0]}*
        ${emoji}
👤 *${args[1]}*

💘 *Match:* ${percentage}%
📊 *Status:* ${status}

${'❤️'.repeat(Math.floor(percentage/10))}${'🖤'.repeat(10 - Math.floor(percentage/10))}

_${config.footer}_`;
    },

    // ═══════════════════════════════════════
    //           TOOLS COMMANDS
    // ═══════════════════════════════════════
    
    weather: async (sock, msg, args) => {
        if (!args.length) {
            return `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃   🌤️ *WEATHER* 🌤️
╰━━━━━━━━━━━━━━━━━━━━━╯

❌ *Please provide a city!*

📝 *Example:*
${config.prefix}weather Lagos
${config.prefix}weather London

_${config.footer}_`;
        }
        return await func.getWeather(args.join(' '));
    },
    
    calc: async (sock, msg, args) => {
        if (!args.length) return "❌ Provide a calculation! Example: !calc 5+5*2";
        try {
            // Safe eval for math only
            const expression = args.join('').replace(/[^0-9+\-*/.()%]/g, '');
            const result = eval(expression);
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   🔢 *CALCULATOR* 🔢
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Expression:* ${expression}
✅ *Result:* ${result}

_${config.footer}_`;
        } catch {
            return "❌ Invalid calculation!";
        }
    },
    
    define: async (sock, msg, args) => {
        if (!args.length) return "❌ Provide a word! Example: !define love";
        try {
            const axios = require('axios');
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${args[0]}`);
            const data = res.data[0];
            const meaning = data.meanings[0];
            return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   📖 *DICTIONARY* 📖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Word:* ${data.word}
🗣️ *Phonetic:* ${data.phonetic || 'N/A'}
📚 *Type:* ${meaning.partOfSpeech}

📖 *Definition:*
${meaning.definitions[0].definition}

${meaning.definitions[0].example ? `💬 *Example:* "${meaning.definitions[0].example}"` : ''}

_${config.footer}_`;
        } catch {
            return "❌ Word not found in dictionary!";
        }
    },

    // ═══════════════════════════════════════
    //           MEDIA COMMANDS
    // ═══════════════════════════════════════
    
    meme: async () => {
        return { type: 'meme' };
    },
    
    cat: async () => {
        return { type: 'cat' };
    },
    
    dog: async () => {
        return { type: 'dog' };
    },

    // ═══════════════════════════════════════
    //          RUNTIME COMMAND
    // ═══════════════════════════════════════
    
    runtime: async () => {
        const uptime = process.uptime();
        return `
╭━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃   ⏱️ *BOT RUNTIME* ⏱️
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

⏰ *Uptime:* ${func.runtime(uptime)}
📡 *Status:* Online
🤖 *Bot:* ${config.botName}

_Running strong!_ 💪

_${config.footer}_`;
    }
};

module.exports = commands;
