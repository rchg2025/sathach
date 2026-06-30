import { google } from 'googleapis';
import stream from 'stream';
import prisma from '../prisma';

export async function uploadFileToDrive(file: Express.Multer.File): Promise<string> {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ['drive_client_email', 'drive_private_key', 'drive_folder_id']
      }
    }
  });

  const config = settings.reduce((acc: any, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  const clientEmail = config.drive_client_email;
  const privateKey = config.drive_private_key;
  const folderId = config.drive_folder_id;

  if (!clientEmail || !privateKey || !folderId) {
    throw new Error('Google Drive configuration is missing in Settings');
  }

  let formattedPrivateKey = privateKey;
  try {
    // If user pasted the whole JSON object
    if (formattedPrivateKey.trim().startsWith('{')) {
      const parsed = JSON.parse(formattedPrivateKey);
      if (parsed.private_key) {
        formattedPrivateKey = parsed.private_key;
      }
    }
  } catch(e) {
    // ignore
  }

  // Handle potentially escaped newlines in private key
  formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
  
  // also, if it's enclosed in quotes, remove them
  if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedPrivateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const fileMetadata = {
    name: `${Date.now()}_${file.originalname}`,
    parents: [folderId],
  };

  const media = {
    mimeType: file.mimetype,
    body: bufferStream,
  };

  const driveRes = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, webViewLink, webContentLink',
  });

  const fileId = driveRes.data.id;
  if (!fileId) throw new Error('Failed to upload file to Google Drive');

  // Make it public so anyone can view the image
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  // Google Drive preview links: replace webViewLink with a direct image link if possible,
  // or just return the webViewLink
  const webViewLink = driveRes.data.webViewLink || '';
  
  return webViewLink;
}
