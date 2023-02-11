import express from 'express';
import { Express } from 'express';
//import { Client, MessageMedia, MessageTypes } from 'whatsapp-web.js';
import { create, Whatsapp, Message, CreateOptions, MessageType } from 'venom-bot';
import { Server } from 'socket.io'
import * as mime from "mime-types";
const probe = require("node-ffprobe");
const vi = require('videoinfo');
import fs from 'fs';


const app: Express = express();
const server = app.listen(3000, () => console.log('listening on port 3000'));
const io = new Server(server);

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

import ffmpegCreator from "fluent-ffmpeg";
const ffmpeg = ffmpegCreator();

ffmpeg.setFfprobePath(ffprobeInstaller.path)
    .setFfmpegPath(ffmpegInstaller.path);
let qrCodeImage: string | null = null;

let client: Whatsapp;

create(<CreateOptions>{
    session: 'StickerBotSession', //name of session
    multidevice: true, // for version not multidevice use false.(default: true)
    catchQR: (qrCode: string) => {
        qrCodeImage = qrCode;
        io.emit('qr', qrCodeImage);
        io.emit('message', 'NEW QR Code received, scan please!');
    }
}).then((clt: Whatsapp) => {
    client = clt;
    start(client);
}).catch((error) => console.log(error))

function start(client: Whatsapp) {
    io.emit('authenticated', 'Whatsapp logged successfully');
    io.emit('message', 'Whatsapp logged successfully');
    io.emit('message', 'Whatsapp client is ready!');

    client.onMessage((message: Message) => {
        generateSticker(message);
        if (message.body === 'Hi' && message.isGroupMsg === false) {
            client
                .sendText(message.from, 'Welcome Venom 🕷')
                .then((result) => {
                    console.log('Result: ', result); //return object success
                })
                .catch((erro) => {
                    console.error('Error when sending: ', erro); //return object error
                });
        }
    });
}
/* 
const client = new Client({
    ffmpegPath: ffmpegInstaller.path,
    puppeteer: {
        args: ['--no-sandbox'],
    }
});
 */

app.get('/', async (req, res) => {
    fs.readFile('src/index.html', 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).send('Erro ao ler arquivo');
        }

        return res.send(data);
    });
})

app.get('/info', (req, res) => {
    //const session = client.session;
    res.send(client?.session);
})

io.on('connection', (socket) => {
    io.emit('message', 'Connected with socket.');
    if (!qrCodeImage && !client?.session) {
        io.emit('message', 'Waiting QR Code...');
    }
    else if (client?.session) {
        io.emit('message', 'Logged!');
    }
    else {
        io.emit('qr', qrCodeImage);
        io.emit('message', 'QR Code received, scan please!');
    }
    console.log('user socket connected');
});
/* 
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
}); */

//client.initialize();

const generateSticker = async (msg: Message) => {
    try {
        if (msg.type == MessageType.IMAGE) {

            const path = await createTempFile(msg);
            await client.sendImageAsSticker(msg.from, path);
            await deleteTempFile(path);
        }
        else if (msg.type == MessageType.VIDEO && !((<any>msg)?.isGif)) {
            const path = await createTempFile(msg);
            convertVideoToGif(path, async (gif: string) => {
                try {
                    await client.sendImageAsStickerGif(msg.from, gif);
                    await deleteTempFile(path);
                    await deleteTempFile(gif);
                }
                catch (ex) {
                    client.sendText(msg.from, "❌ Error to process media");
                }

            });
        }
        else if ((<any>msg)?.isGif) {
            const path = await createTempFile(msg);
            convertVideoToGif(path, async (gif: string) => {
                try {
                    await client.sendImageAsStickerGif(msg.from, gif);
                    await deleteTempFile(path);
                    await deleteTempFile(gif);
                }
                catch (ex) {
                    client.sendText(msg.from, "❌ Error to process media");
                }

            });
        }

    } catch (e) {
        client.sendText(msg.from, "❌ Error to process media");
    }
}

async function createTempFile(msg: Message, ext: string = '') {
    const buffer = await client.decryptFile(msg);
    debugger;
    const output = `file-${Date.now().toString()}.${(ext ? ext : mime.extension(msg.mimetype))}`;
    //const output = `file-${Date.now().toString()}.${mime.extension(msg.mimetype)}`;
    await fs.writeFileSync(output, buffer);
    return output;
}

async function deleteTempFile(path: string) {
    await fs.unlinkSync(path);
}

function convertVideoToGif(input: string, onFinished?: (gifPath: string) => void) {
    const output = `output-${Date.now().toString()}.gif`;

    /* ffmpeg.input(input)
        .ffprobe((err: any, data: ffmpegCreator.FfprobeData) => {
            debugger;

            //const width = ((data?.streams[0]?.width || true) > 512 ? 512 : data.streams[0].width) + 'x512';

           
        }) */
        const duration = 5;
        const sizeLimit = '512k';
        const bitRate = '10k';

    ffmpeg
        .input(input)
        .output(output)
        .outputOptions([
            `-t ${duration}`,
            `-b:v ${bitRate}`,
            '-pix_fmt rgb24',
            '-loop 0'
          ])
        .duration(duration)
        .size('512x512')
        .on("end", async () => {
            if (onFinished) onFinished(output);
            console.log("Finished");
        })
        .on("error", (e) => console.log(e))
        .run();
}

