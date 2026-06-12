import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, onSnapshot, orderBy, deleteDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

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
  await addDoc(collection(db, "notifications"), {
    plate,
    senderPhone,
    ownerUid,
    createdAt: new Date().toISOString(),
    status: 'unread'
  });
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
