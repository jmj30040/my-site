import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_UPLOAD_TIMEOUT_MS = 30000;

function requireFirebase() {
  if (!auth || !db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }
}

function getCollection(collectionName) {
  requireFirebase();
  return collection(db, collectionName);
}

function requireStorage() {
  if (!storage) {
    throw new Error('Firebase Storage 환경변수가 설정되지 않았습니다.');
  }
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function getStorageErrorMessage(caughtError) {
  if (caughtError.message === '이미지 업로드 시간이 초과되었습니다. 네트워크 상태와 Firebase Storage 설정을 확인해주세요.') {
    return caughtError.message;
  }

  if (caughtError.code === 'storage/unauthorized') {
    return '이미지 업로드 권한이 없습니다. Firebase Storage Rules에서 로그인한 사용자의 업로드를 허용해주세요.';
  }

  if (caughtError.code === 'storage/quota-exceeded') {
    return 'Firebase Storage 용량 또는 사용량 한도를 초과했습니다.';
  }

  if (caughtError.code === 'storage/retry-limit-exceeded' || caughtError.code === 'storage/canceled') {
    return '이미지 업로드가 완료되지 않았습니다. 네트워크 상태를 확인한 뒤 다시 시도해주세요.';
  }

  return caughtError.message;
}

function normalizeNickname(nickname) {
  return nickname.trim().replace(/\s+/g, ' ');
}

function validatePin(pin) {
  return /^\d{6}$/.test(pin);
}

async function hashText(value) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getNicknameKey(nickname) {
  const normalizedKeySource = normalizeNickname(nickname).toLowerCase();
  const fullHash = await hashText(normalizedKeySource);
  return fullHash.slice(0, 32);
}

async function getAuthEmail(nickname) {
  return `ow-${await getNicknameKey(nickname)}@ow-friends.local`;
}

function publicUserFromDoc(userDoc) {
  if (!userDoc.exists()) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    nickname: data.nickname,
    profileImageUrl: data.profileImageUrl ?? '',
  };
}

async function getUserByUid(uid) {
  requireFirebase();
  const userDoc = await getDoc(doc(db, 'users', uid));
  return publicUserFromDoc(userDoc);
}

export function subscribeAuthUser(callback) {
  requireFirebase();

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    try {
      const appUser = await getUserByUid(firebaseUser.uid);
      callback(appUser);
    } catch {
      callback(null);
    }
  });
}

export async function signUpWithNickname({ nickname, pin }) {
  requireFirebase();
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedNickname) {
    throw new Error('닉네임을 입력해주세요.');
  }

  if (!validatePin(pin)) {
    throw new Error('PIN은 숫자 6자리만 가능합니다.');
  }

  const nicknameKey = await getNicknameKey(normalizedNickname);
  const usernameRef = doc(db, 'usernames', nicknameKey);
  const existingUsername = await getDoc(usernameRef);

  if (existingUsername.exists()) {
    throw new Error('이미 사용 중인 닉네임입니다.');
  }

  const credential = await createUserWithEmailAndPassword(auth, await getAuthEmail(normalizedNickname), pin);

  try {
    await runTransaction(db, async (transaction) => {
      const usernameDoc = await transaction.get(usernameRef);

      if (usernameDoc.exists()) {
        throw new Error('이미 사용 중인 닉네임입니다.');
      }

      transaction.set(usernameRef, {
        uid: credential.user.uid,
        nickname: normalizedNickname,
        createdAt: serverTimestamp(),
      });
      transaction.set(doc(db, 'users', credential.user.uid), {
        nickname: normalizedNickname,
        nicknameKey,
        profileImageUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (caughtError) {
    await deleteUser(credential.user).catch(() => {});
    throw caughtError;
  }

  return {
    id: credential.user.uid,
    nickname: normalizedNickname,
    profileImageUrl: '',
  };
}

export async function loginWithNickname({ nickname, pin }) {
  requireFirebase();
  const normalizedNickname = normalizeNickname(nickname);

  if (!normalizedNickname) {
    throw new Error('닉네임을 입력해주세요.');
  }

  if (!validatePin(pin)) {
    throw new Error('PIN은 숫자 6자리만 가능합니다.');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, await getAuthEmail(normalizedNickname), pin);
    const appUser = await getUserByUid(credential.user.uid);

    if (!appUser) {
      throw new Error('사용자 정보가 없습니다.');
    }

    return appUser;
  } catch (caughtError) {
    if (
      caughtError.code === 'auth/invalid-credential' ||
      caughtError.code === 'auth/user-not-found' ||
      caughtError.code === 'auth/wrong-password'
    ) {
      throw new Error('닉네임 또는 PIN이 일치하지 않습니다.');
    }

    throw caughtError;
  }
}

export function logout() {
  requireFirebase();
  return signOut(auth);
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

export async function uploadProfileImage(userId, imageFile) {
  requireStorage();

  if (!imageFile?.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  if (imageFile.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('프로필 이미지는 5MB 이하만 업로드할 수 있습니다.');
  }

  const extension = imageFile.name.includes('.') ? imageFile.name.split('.').pop() : 'jpg';
  const imageRef = ref(storage, `profile-images/${userId}/${Date.now()}.${extension}`);

  try {
    const snapshot = await withTimeout(
      uploadBytes(imageRef, imageFile),
      PROFILE_IMAGE_UPLOAD_TIMEOUT_MS,
      '이미지 업로드 시간이 초과되었습니다. 네트워크 상태와 Firebase Storage 설정을 확인해주세요.',
    );
    return await withTimeout(
      getDownloadURL(snapshot.ref),
      PROFILE_IMAGE_UPLOAD_TIMEOUT_MS,
      '이미지 주소를 가져오는 시간이 초과되었습니다. Firebase Storage 설정을 확인해주세요.',
    );
  } catch (caughtError) {
    throw new Error(getStorageErrorMessage(caughtError));
  }
}

export function createProfile(profile, currentUser) {
  return addDoc(getCollection('profiles'), {
    ...profile,
    profileImageUrl: profile.profileImageUrl ?? '',
    ownerId: currentUser.id,
    ownerNickname: currentUser.nickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateProfile(id, profile) {
  requireFirebase();
  return updateDoc(doc(db, 'profiles', id), {
    ...profile,
    updatedAt: serverTimestamp(),
  });
}

export function deleteProfile(id) {
  requireFirebase();
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
  const participantIds = schedule.participantIds?.length ? schedule.participantIds : [currentUser.id];

  return addDoc(getCollection('schedules'), {
    ...schedule,
    participants,
    participantIds,
    ownerId: currentUser.id,
    ownerNickname: currentUser.nickname,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateSchedule(id, schedule) {
  requireFirebase();
  return updateDoc(doc(db, 'schedules', id), {
    ...schedule,
    updatedAt: serverTimestamp(),
  });
}

export function deleteSchedule(id) {
  requireFirebase();
  return deleteDoc(doc(db, 'schedules', id));
}

export function joinSchedule(schedule, currentUser) {
  const participants = schedule.participants ?? [];
  const participantIds = schedule.participantIds ?? [];

  if (participantIds.includes(currentUser.id) || participants.includes(currentUser.nickname)) {
    return Promise.resolve();
  }

  return updateSchedule(schedule.id, {
    participants: [...participants, currentUser.nickname],
    participantIds: [...participantIds, currentUser.id],
  });
}

export function leaveSchedule(schedule, currentUser) {
  return updateSchedule(schedule.id, {
    participants: (schedule.participants ?? []).filter((participant) => participant !== currentUser.nickname),
    participantIds: (schedule.participantIds ?? []).filter((participantId) => participantId !== currentUser.id),
  });
}
