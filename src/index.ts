import express from 'express';
import { Express } from 'express';
import { Client, MessageMedia, Message, MessageTypes } from 'whatsapp-web.js';
import { Server } from 'socket.io'
import qrcode from 'qrcode';
import fs from 'fs';

const app: Express = express();
const server = app.listen(3000, () => console.log('listening on port 3000'));

const io = new Server(server);

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
const ffprobe = require("@ffprobe-installer/ffprobe");

import ffmpegCreator from "fluent-ffmpeg";
const ffmpeg = ffmpegCreator();

ffmpeg.setFfprobePath(ffprobe.path)
    .setFfmpegPath(ffmpegInstaller.path);

const client = new Client({
    ffmpegPath: ffmpegInstaller.path,
    puppeteer: {
        args: ['--no-sandbox'],
    }
});


let qrCodeImage: string | null = null;

app.get('/', (req, res) => {
    fs.readFile('src/index.html', 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler arquivo');
        }

        return res.send(data);
    });

    io.emit('message', client.info);
})

app.get('/info', (req, res) => {
    res.send(client.info);
})

io.on('connection', (socket) => {
    io.emit('message', 'Connected with socket.');
    if(!qrCodeImage) {
        io.emit('message', 'Waiting QR Code...');
    }
    else {
        io.emit('qr', qrCodeImage);
        io.emit('message', 'QR Code received, scan please!');
    } 
    console.log('user socket connected');
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        qrCodeImage = url;
        io.emit('qr', qrCodeImage);
        io.emit('message', 'NEW QR Code received, scan please!');
    });
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

const generateSticker = async (msg: Message) => {
    try {
        if (msg.type == MessageTypes.VIDEO || msg.type == MessageTypes.IMAGE) {
            let messageMedia: MessageMedia | undefined = await msg.downloadMedia();
            debugger;
            if (msg.isGif && !messageMedia) {
                //msg.body = msg.from;
                //msg.forward(msg.to);
                const gifBase64 = (<any>msg)._data?.body;
                messageMedia = new MessageMedia("image/gif", gifBase64, "image.gif");
            }
           /*  else if(msg.isGif && messageMedia && msg.body){
                msg.forward(msg.body);
            } */
            else if(!messageMedia) {
                //return;
                msg.reply("❌ Error to process media");
            }
            else {
                /* if(msg.from.includes('21996829157')) {
                    msg.reply(messageMedia, undefined, { sendMediaAsSticker: true });    
                } */
                //return;
                msg.reply(messageMedia!, undefined, { sendMediaAsSticker: true });
            }
        }

    } catch (e) {
        //return;
        msg.reply("❌ Error to process media");
    }
}
/* 
async function convertGifToMp4(inputBase64: string, onFinished?: (video: string) => void) {
    const input = `input-${Date.now().toString()}.gif`;
    const output = `output-${Date.now().toString()}.mp4`;
    await fs.writeFileSync(input, Buffer.from(inputBase64, "base64"));

    ffmpeg
        .input(input)
        .noAudio()
        .output(output)
        .on("end", async () => {
            fs.unlinkSync(input);
            debugger;
            let video = (await fs.readFileSync(output)).toString("base64");
            fs.unlinkSync(output);
            if (onFinished) onFinished(video);
            console.log("Finished");
        })
        .on("error", (e) => console.log(e))
        .run();
} */

