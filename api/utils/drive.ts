import { google } from 'googleapis';
import stream from 'stream';
import prisma from '../prisma';

function formatPrivateKey(key: string) {
  let formatted = key;
  try {
    if (formatted.trim().startsWith('{')) {
      const parsed = JSON.parse(formatted);
      if (parsed.private_key) {
        formatted = parsed.private_key;
      }
    }
  } catch(e) {}
  formatted = formatted.replace(/\\n/g, '\n');
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

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

  const formattedPrivateKey = formatPrivateKey(privateKey);

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
    supportsAllDrives: true, // Required for Team Drives (Shared Drives)
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
    supportsAllDrives: true, // Ensure permissions can be updated on Team Drives
  });

  // Return a direct image link format so it can be embedded in <img> tags
  // Using lh3.googleusercontent.com/d/ is the most reliable way to embed Drive images in 2024
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export async function testDriveConnection(clientEmail: string, privateKey: string, folderId: string): Promise<boolean> {
  const formattedPrivateKey = formatPrivateKey(privateKey);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: formattedPrivateKey,
    },
    // Adding drive.readonly to check folder existence
    scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  try {
    // Attempt to get the folder metadata
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    });
    
    // Check if it's actually a folder
    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw new Error('The specified ID is not a folder.');
    }
    
    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Lỗi kết nối tới Google Drive API');
  }
}
