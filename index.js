const express = require('express');
const app = express();
const server = app.listen(3000, () => console.log('listening on port 3000'));

const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { Server } = require('socket.io')
const io = new Server(server);
const client = new Client();

let qrCodeImage = null;

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
    io.emit('message', client.info);
})

app.get('/info', (req, res) => {
    res.sendFile(__dirname + '/index.html');
    res.send(client.info);
})

io.on('connection', (socket) => {
    io.emit('message', 'Connected with socket.');

    client.removeListener('qr', () => {});
    client.off('qr', () => {});
    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            qrCodeImage = url;
            io.emit('qr', qrCodeImage);
            io.emit('message', 'NEW QR Code received, scan please!');
        });
    });

    io.emit('qr', qrCodeImage);
    io.emit('message', 'QR Code received, scan please!');
    console.log('a user connected');
});

client.on('ready', () => {
    io.emit('authenticated', 'Whatsapp logged successfully');
    io.emit('message', 'Whatsapp logged successfully');
    io.emit('message', 'Whatsapp client is ready!');
    console.log('Client is ready!');
});

client.on('message', msg => {
    generateSticker(msg);
});

client.initialize();

const generateSticker = async (msg) => {
    if (msg.type === "image") {
        try {
            const { data } = await msg.downloadMedia()
            const image = await new MessageMedia("image/jpeg", data, "image.jpg")
            msg.reply(image, null, { sendMediaAsSticker: true })
        } catch (e) {
            msg.reply("❌ Erro ao processar imagem")
        }
    }
}