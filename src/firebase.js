// src/firebase.js
// ─────────────────────────────────────────────────────────────────────────────
// 1. Зайди на https://console.firebase.google.com
// 2. Создай проект → добавь Web-приложение
// 3. Включи Authentication → Email/Password
// 4. Создай Firestore Database (режим test или с Rules ниже)
// 5. Вставь свой firebaseConfig ниже
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
} from "firebase/firestore";

// ── ЗАМЕНИ НА СВОЙ CONFIG ────────────────────────────────────────────────────
  const firebaseConfig = {
  apiKey: "AIzaSyCQ0H_WECCxS3cKTSlRW8OPwa11CvbwGxY",
  authDomain: "squad-uat-b3dbd.firebaseapp.com",
  projectId: "squad-uat-b3dbd",
  storageBucket: "squad-uat-b3dbd.firebasestorage.app",
  messagingSenderId: "1044385578531",
  appId: "1:1044385578531:web:343317ec5ac0e314ffbb96"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Цвета аватаров — назначаются при регистрации
const AVATAR_COLORS = [
  "#7C6AF7", "#E8735A", "#3DB88B", "#E8A23A",
  "#5AA8E8", "#D45AE8", "#E85A8A", "#5AE8D4",
];
function randomColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}
function initials(name) {
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

export async function register(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });

  const userDoc = {
    id: cred.user.uid,
    name,
    bio: "",
    avatar: initials(name),
    color: randomColor(),
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", cred.user.uid), userDoc);
  return userDoc;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const snap = await getDoc(doc(db, "users", cred.user.uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function logout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) { callback(null); return; }
    const snap = await getDoc(doc(db, "users", user.uid));
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function updateBio(uid, bio) {
  await updateDoc(doc(db, "users", uid), { bio });
}

// Подписка на всех пользователей (realtime)
export function subscribeUsers(callback) {
  return onSnapshot(collection(db, "users"), snap => {
    const users = {};
    snap.docs.forEach(d => { users[d.id] = { id: d.id, ...d.data() }; });
    callback(users);
  });
}

// ── POSTS ─────────────────────────────────────────────────────────────────────

export async function createPost(authorId, text) {
  return addDoc(collection(db, "posts"), {
    authorId,
    text,
    likes: [],
    createdAt: serverTimestamp(),
  });
}

// Подписка на ленту постов (realtime, по убыванию времени)
export function subscribePosts(callback) {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function toggleLike(postId, userId) {
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const liked = (snap.data().likes || []).includes(userId);
  await updateDoc(ref, {
    likes: liked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

// ── COMMENTS ──────────────────────────────────────────────────────────────────

export async function addComment(postId, authorId, text) {
  return addDoc(collection(db, "posts", postId, "comments"), {
    authorId,
    text,
    createdAt: serverTimestamp(),
  });
}

// Подписка на комментарии конкретного поста (realtime)
export function subscribeComments(postId, callback) {
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
