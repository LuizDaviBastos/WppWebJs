"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const whatsapp_web_js_1 = require("whatsapp-web.js");
const socket_io_1 = require("socket.io");
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const server = app.listen(3000, () => console.log('listening on port 3000'));
const io = new socket_io_1.Server(server);
const client = new whatsapp_web_js_1.Client({
    puppeteer: {
        args: ['--no-sandbox'],
    }
});
let qrCodeImage = null;
app.get('/', (req, res) => {
    //res.sendFile(__dirname + '/index.html');
    fs_1.default.readFile('src/index.html', 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler arquivo');
        }
        return res.send(data);
    });
    io.emit('message', client.info);
});
app.get('/info', (req, res) => {
    res.sendFile(__dirname + '/index.html');
    res.send(client.info);
});
io.on('connection', (socket) => {
    io.emit('message', 'Connected with socket.');
    client.removeListener('qr', () => { });
    client.off('qr', () => { });
    client.on('qr', (qr) => {
        qrcode_1.default.toDataURL(qr, (err, url) => {
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
const generateSticker = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (msg.type === "image") {
        try {
            const { data } = yield msg.downloadMedia();
            const image = yield new whatsapp_web_js_1.MessageMedia("image/jpeg", data, "image.jpg");
            msg.reply(image, undefined, { sendMediaAsSticker: true });
        }
        catch (e) {
            msg.reply("❌ Erro ao processar imagem");
        }
    }
});
