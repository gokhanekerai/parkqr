import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBEmY5vau6HucxG-N0c3J4FeRg44fT1GMU",
  authDomain: "parkqr-e2f59.firebaseapp.com",
  projectId: "parkqr-e2f59",
  storageBucket: "parkqr-e2f59.firebasestorage.app",
  messagingSenderId: "646166365025",
  appId: "1:646166365025:web:dbe0924b6c6ab632e6bb20"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
let messaging = null;

const initMessaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      messaging = getMessaging(app);
    }
  } catch (e) {
    console.log("Messaging unsupported", e);
  }
};
initMessaging();

export const requestNotificationPermission = async (uid) => {
  if (!messaging) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, { vapidKey: 'BCIYSZ6Aej1Bl-Hw4ps-ooZ7WZ6_shtS18mxXKO6tKxCilOBzZGqB8rz_PYh4adyWtigIezPqDLx_R_66A83MvE' });
      if (token) {
        await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
        return true;
      }
    }
  } catch (e) {
    console.error("Token alınırken hata:", e);
  }
  return false;
};

// Yardımcı DB fonksiyonları
export const getTagById = async (tagId) => {
  const q = query(collection(db, "tags"), where("tagId", "==", tagId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
};

export const activateTag = async (tagId, plate, uid, ownerPhone = "") => {
  // Önce tag var mı bakalım, yoksa oluşturalım
  const existing = await getTagById(tagId);
  if (existing) {
    // Güncelle
    const tagRef = doc(db, "tags", existing.id);
    await updateDoc(tagRef, { plate: plate.toUpperCase(), ownerUid: uid, ownerPhone, status: 'active' });
  } else {
    // Yeni ekle
    await addDoc(collection(db, "tags"), {
      tagId,
      plate: plate.toUpperCase(),
      ownerUid: uid,
      ownerPhone,
      status: 'active',
      createdAt: new Date().toISOString()
    });
  }
};

export const createNotification = async (plate, senderPhone, ownerUid) => {
  try {
    // 1. Bildirimi Veritabanına Kaydet
    await addDoc(collection(db, "notifications"), {
      plate,
      senderPhone,
      ownerUid,
      createdAt: new Date().toISOString()
    });

    // 2. Kullanıcının FCM (Push) Token'ını bul
    const userDocRef = doc(db, "users", ownerUid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists() && userDoc.data().fcmToken) {
      // 3. Vercel Backend'e Push İsteği Gönder
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: userDoc.data().fcmToken,
          plate,
          senderPhone
        })
      });
    }
  } catch (e) {
    console.error("Bildirim oluşturma hatası:", e);
  }
};

export const deleteTagRecord = async (docId) => {
  await deleteDoc(doc(db, "tags", docId));
};

export const updateTagInfo = async (docId, newPlate, newPhone) => {
  await updateDoc(doc(db, "tags", docId), {
    plate: newPlate,
    ownerPhone: newPhone || ""
  });
};
