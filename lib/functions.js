const axios = require('axios');
const config = require('../config');

// ═══════════════════════════════════════════════════════════════
//                      HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Format runtime
function runtime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Get greeting based on time
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning 🌅";
    if (hour >= 12 && hour < 17) return "Good Afternoon ☀️";
    if (hour >= 17 && hour < 21) return "Good Evening 🌆";
    return "Good Night 🌙";
}

// Get current time
function getTime() {
    return new Date().toLocaleTimeString('en-US', { 
        timeZone: config.timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Get current date
function getDate() {
    return new Date().toLocaleDateString('en-US', {
        timeZone: config.timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Free AI Chat Function
async function aiChat(prompt) {
    try {
        // Using free AI API
        const response = await axios.get(`https://api.siputzx.my.id/api/ai/gpt4o?content=${encodeURIComponent(prompt)}`);
        if (response.data && response.data.data) {
            return response.data.data;
        }
        
        // Backup AI
        const backup = await axios.get(`https://aemt.me/luminai?text=${encodeURIComponent(prompt)}`);
        if (backup.data && backup.data.result) {
            return backup.data.result;
        }
        
        return "Sorry, I couldn't process that right now. Please try again! 🙏";
    } catch (error) {
        console.log("AI Error:", error.message);
        return "AI is temporarily unavailable. Please try again later! 🔄";
    }
}

// Random picker
function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// Get random quote
async function getQuote() {
    try {
        const res = await axios.get('https://api.quotable.io/random');
        return `*"${res.data.content}"*\n\n_— ${res.data.author}_`;
    } catch {
        const quotes = [
            { q: "Success is not final, failure is not fatal.", a: "Winston Churchill" },
            { q: "Believe you can and you're halfway there.", a: "Theodore Roosevelt" },
            { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" }
        ];
        const quote = pickRandom(quotes);
        return `*"${quote.q}"*\n\n_— ${quote.a}_`;
    }
}

// Get random joke
async function getJoke() {
    try {
        const res = await axios.get('https://official-joke-api.appspot.com/random_joke');
        return `😂 *${res.data.setup}*\n\n${res.data.punchline}`;
    } catch {
        const jokes = [
            "Why don't scientists trust atoms? Because they make up everything! 😂",
            "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
            "I told my wife she was drawing her eyebrows too high. She looked surprised! 😮"
        ];
        return pickRandom(jokes);
    }
}

// Get weather
async function getWeather(city) {
    try {
        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=060a6bcfa19809c2cd4d97a212b19273&units=metric`);
        const data = res.data;
        return `
╭━━━━━━━━━━━━━━━━━━━━╮
┃  🌤️ *WEATHER INFO*
╰━━━━━━━━━━━━━━━━━━━━╯

📍 *Location:* ${data.name}, ${data.sys.country}
🌡️ *Temperature:* ${data.main.temp}°C
🤒 *Feels Like:* ${data.main.feels_like}°C
💧 *Humidity:* ${data.main.humidity}%
🌬️ *Wind:* ${data.wind.speed} m/s
☁️ *Condition:* ${data.weather[0].description}

_${config.footer}_`;
    } catch {
        return "❌ City not found! Please check the spelling.";
    }
}

// Lyrics finder
async function getLyrics(song) {
    try {
        const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(song)}`);
        return res.data.lyrics || "Lyrics not found!";
    } catch {
        return "❌ Could not find lyrics for this song!";
    }
}

module.exports = {
    runtime,
    getGreeting,
    getTime,
    getDate,
    aiChat,
    pickRandom,
    getQuote,
    getJoke,
    getWeather,
    getLyrics
};
