import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

const SESSION_STORAGE_KEY = 'owCurrentUser';

function getCollection(collectionName) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return collection(db, collectionName);
}

function normalizeNickname(nickname) {
  return nickname.trim();
}

function validatePin(pin) {
  return /^\d{4}$/.test(pin);
}

async function hashPin(nickname, pin) {
  // MVP용 간단 인증입니다. 실제 서비스에서는 Firebase Authentication을 사용하세요.
  const normalizedNickname = normalizeNickname(nickname).toLowerCase();
  const payload = `${normalizedNickname}:${pin}`;
  const encodedPayload = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedPayload);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function findUserByNickname(nickname) {
  const normalizedNickname = normalizeNickname(nickname);
  const usersQuery = query(getCollection('users'), where('nickname', '==', normalizedNickname), limit(1));
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) {
    return null;
  }

  const userDoc = snapshot.docs[0];
  return {
    id: userDoc.id,
    ...userDoc.data(),
  };
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);
    return parsedUser?.id && parsedUser?.nickname ? parsedUser : null;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function storeUserSession(user) {
  localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      id: user.id,
      nickname: user.nickname,
    }),
  );
}

export function clearUserSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export async function signUpWithNickname({ nickname, pin }) {
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedNickname) {
    throw new Error('닉네임을 입력해주세요.');
  }

  if (!validatePin(pin)) {
    throw new Error('PIN은 숫자 4자리만 가능합니다.');
  }

  const existingUser = await findUserByNickname(normalizedNickname);

  if (existingUser) {
    throw new Error('이미 사용 중인 닉네임입니다.');
  }

  const pinHash = await hashPin(normalizedNickname, pin);
  const userRef = await addDoc(getCollection('users'), {
    nickname: normalizedNickname,
    pinHash,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const user = {
    id: userRef.id,
    nickname: normalizedNickname,
  };
  storeUserSession(user);
  return user;
}

export async function loginWithNickname({ nickname, pin }) {
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedNickname) {
    throw new Error('닉네임을 입력해주세요.');
  }

  if (!validatePin(pin)) {
    throw new Error('PIN은 숫자 4자리만 가능합니다.');
  }

  const user = await findUserByNickname(normalizedNickname);

  if (!user) {
    throw new Error('존재하지 않는 닉네임입니다.');
  }

  const pinHash = await hashPin(normalizedNickname, pin);

  if (user.pinHash !== pinHash) {
    throw new Error('PIN이 일치하지 않습니다.');
  }

  const sessionUser = {
    id: user.id,
    nickname: user.nickname,
  };
  storeUserSession(sessionUser);
  return sessionUser;
}

export function subscribeProfiles(callback, onError) {
  const profilesQuery = query(getCollection('profiles'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    profilesQuery,
    (snapshot) => {
      const profiles = snapshot.docs.map((profileDoc) => ({
        id: profileDoc.id,
        ...profileDoc.data(),
      }));
      callback(profiles);
    },
    onError,
  );
}

export function createProfile(profile, currentUser) {
  return addDoc(getCollection('profiles'), {
    ...profile,
    ownerId: currentUser.id,
    ownerNickname: currentUser.nickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateProfile(id, profile) {
  return updateDoc(doc(db, 'profiles', id), {
    ...profile,
    updatedAt: serverTimestamp(),
  });
}

export function deleteProfile(id) {
  return deleteDoc(doc(db, 'profiles', id));
}

export function subscribeSchedules(callback, onError) {
  return onSnapshot(
    getCollection('schedules'),
    (snapshot) => {
      const schedules = snapshot.docs
        .map((scheduleDoc) => ({
          id: scheduleDoc.id,
          ...scheduleDoc.data(),
        }))
        .sort((firstSchedule, secondSchedule) => {
          const firstDateTime = `${firstSchedule.date ?? ''} ${firstSchedule.startTime ?? ''}`;
          const secondDateTime = `${secondSchedule.date ?? ''} ${secondSchedule.startTime ?? ''}`;
          return firstDateTime.localeCompare(secondDateTime);
        });
      callback(schedules);
    },
    onError,
  );
}

export function createSchedule(schedule, currentUser) {
  const participants = schedule.participants?.length ? schedule.participants : [currentUser.nickname];

  return addDoc(getCollection('schedules'), {
    ...schedule,
    participants,
    ownerId: currentUser.id,
    ownerNickname: currentUser.nickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateSchedule(id, schedule) {
  return updateDoc(doc(db, 'schedules', id), {
    ...schedule,
    updatedAt: serverTimestamp(),
  });
}

export function deleteSchedule(id) {
  return deleteDoc(doc(db, 'schedules', id));
}

export function joinSchedule(schedule, currentUser) {
  const participants = schedule.participants ?? [];

  if (participants.includes(currentUser.nickname)) {
    return Promise.resolve();
  }

  return updateSchedule(schedule.id, {
    participants: [...participants, currentUser.nickname],
  });
}

export function leaveSchedule(schedule, currentUser) {
  return updateSchedule(schedule.id, {
    participants: (schedule.participants ?? []).filter((participant) => participant !== currentUser.nickname),
  });
}
