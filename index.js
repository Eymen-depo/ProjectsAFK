const mineflayer = require('mineflayer');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

let botConnected = false;
let timers = []; // Aktif zamanlayıcıları takip etmek için array

const config = {
  botAccount: {
    username: "Witcher_",
    password: "fake3",
    type: "legacy"
  },
  server: {
    ip: "mc.reborncraft.pw",
    port: 25565,
    version: "1.21.6"
  },
  utils: {
    autoAuth: {
      enabled: true,
      password: "fake3"
    },
    chatMessages: {
      enabled: true,
      messages: [     
        { text: "/login fake3", delay: 10 },
        { text: "/skyblock", delay: 10 },
        { text: "/is go EymanBey", delay: 10 },                 
        { text: "/is go EymanBey", delay: 500 }
      ]
    },
    antiAfk: {
      enabled: true
    },
    autoReconnect: true,
    autoReconnectDelay: 5000
  }
};

let bot;

// Güvenli mesaj gönderme fonksiyonu
function safeChat(message) {
  if (bot && bot._client && typeof bot._client.chat === 'function') {
    try {
      bot.chat(message);
      console.log(`Gönderildi: ${message}`);
    } catch (err) {
      console.error(`Mesaj gönderilirken hata oluştu: ${err.message}`);
    }
  } else {
    console.log(`[Atlandı] Bot bağlı değil veya chat henüz hazır değil: ${message}`);
  }
}

// Tüm zamanlayıcıları temizleme fonksiyonu
function clearAllTimers() {
  timers.forEach(timer => clearTimeout(timer));
  timers = [];
}

function startBot() {
  clearAllTimers(); // Önceki oturumdan kalan tüm zamanlayıcıları temizle

  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config.botAccount.username,
    password: config.botAccount.password,
    version: config.server.version,
    auth: config.botAccount.type
  });

  bot.on('spawn', () => {
    console.log('Bot oyuna giriş yaptı!');
    botConnected = true;

    // Otomatik Giriş
    if (config.utils.autoAuth.enabled) {
      safeChat(`/login ${config.utils.autoAuth.password}`);
    }

    // Sıralı Mesaj Gönderimi
    if (config.utils.chatMessages.enabled) {
      config.utils.chatMessages.messages.forEach((messageObj) => {
        const timer = setTimeout(() => {
          safeChat(messageObj.text);
        }, messageObj.delay * 1000);
        timers.push(timer);
      });
    }

    // Anti-AFK Döngüsü
    if (config.utils.antiAfk.enabled) {
      const runAntiAfk = () => {
        if (!botConnected) return;

        const moveDirections = ['forward', 'back', 'left', 'right'];
        const randomDirection = moveDirections[Math.floor(Math.random() * moveDirections.length)];

        try {
          bot.setControlState(randomDirection, true);
          const stopTimer = setTimeout(() => {
            if (bot) bot.setControlState(randomDirection, false);
          }, 100);
          timers.push(stopTimer);

          console.log(`Bot ${randomDirection} yönüne hareket etti.`);
        } catch (err) {
          console.error(`Anti-AFK hatası: ${err.message}`);
        }

        // Bir sonraki hareketi 30 saniye sonra planla
        const nextAfkTimer = setTimeout(runAntiAfk, 30000);
        timers.push(nextAfkTimer);
      };

      const initialAfkTimer = setTimeout(runAntiAfk, 30000);
      timers.push(initialAfkTimer);
    }
  });

  bot.on('message', (message) => {
    console.log(message.toString());
  });

  bot.on('error', (err) => {
    console.error('Bot Hatası:', err.message);
  });

  bot.on('end', () => {
    console.log('Bot bağlantısı kesildi. Zamanlayıcılar temizleniyor...');
    botConnected = false;
    clearAllTimers();

    if (config.utils.autoReconnect) {
      console.log(`${config.utils.autoReconnectDelay / 1000} saniye sonra yeniden bağlanılacak...`);
      setTimeout(startBot, config.utils.autoReconnectDelay);
    }
  });
}

// Botu başlat
startBot();

// Web sunucusu
app.get('/', (req, res) => {
  if (botConnected) {
    res.send('Bot başarıyla bağlandı ve aktif.');
  } else {
    res.send('Bot bağlantı kurmaya çalışıyor...');
  }
});

app.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
