import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Firebase Admin Key'ini Vercel ortam değişkenlerinden al
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Firebase Admin initialization error', error.stack);
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token, plate, senderPhone, message } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'FCM Token missing' });
  }

  const payload = {
    notification: {
      title: '🚨 Araç Çağrısı!',
      body: `${plate} plakalı aracınız için çağrı var! ${message ? `Neden: ${message}. ` : ''}İletişim: ${senderPhone || 'Bilinmiyor'}`,
    }
  };

  try {
    const response = await admin.messaging().send({
      token,
      notification: payload.notification
    });
    return res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: error.message });
  }
}
