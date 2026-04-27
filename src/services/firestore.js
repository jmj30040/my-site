import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

const SESSION_STORAGE_KEY = 'owFriendsSessionUserId';
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_MAX_DIMENSION = 320;
const PROFILE_IMAGE_MAX_DATA_URL_LENGTH = 300000;
const PROFILE_IMAGE_QUALITY_STEPS = [0.82, 0.72, 0.62, 0.52, 0.42];

function requireFirebase() {
  if (!auth || !db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }
}

function getCollection(collectionName) {
  requireFirebase();
  return collection(db, collectionName);
}

function normalizeNickname(nickname) {
  return nickname.trim().replace(/\s+/g, ' ');
}

function loadImageFromFile(imageFile) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(imageFile);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 읽을 수 없습니다. 다른 이미지 파일을 선택해주세요.'));
    };

    image.src = objectUrl;
  });
}

function getResizedImageSize(width, height) {
  const ratio = Math.min(PROFILE_IMAGE_MAX_DIMENSION / width, PROFILE_IMAGE_MAX_DIMENSION / height, 1);

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
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

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPin(pin, salt) {
  return hashText(`${salt}:${pin}`);
}

function createTemporaryPin() {
  const pinNumber = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return pinNumber.toString().padStart(6, '0');
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
  const normalizedRole = String(data.role ?? '').trim().toLowerCase();

  return {
    id: userDoc.id,
    isAdmin: normalizedRole === 'admin',
    nickname: data.nickname,
    nicknameKey: data.nicknameKey ?? '',
    profileImageUrl: data.profileImageUrl ?? '',
    role: normalizedRole,
    status: data.status ?? 'approved',
    temporaryPinIssuedAt: data.temporaryPinIssuedAt ?? null,
  };
}

async function getUserByUid(uid) {
  requireFirebase();
  const userDoc = await getDoc(doc(db, 'users', uid));
  return publicUserFromDoc(userDoc);
}

export function subscribeAuthUser(callback) {
  requireFirebase();
  let unsubscribeUserDoc = () => {};

  const subscribeSessionUser = (userId) => {
    unsubscribeUserDoc();
    unsubscribeUserDoc = () => {};

    if (!userId) {
      callback(null);
      return;
    }

    unsubscribeUserDoc = onSnapshot(
      doc(db, 'users', userId),
      (userDoc) => {
        const appUser = publicUserFromDoc(userDoc);

        if (!appUser || appUser.status === 'deleted') {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          callback(null);
          return;
        }

        callback(appUser);
      },
      () => callback(null),
    );
  };

  subscribeSessionUser(localStorage.getItem(SESSION_STORAGE_KEY));

  const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
    if (!firebaseUser || localStorage.getItem(SESSION_STORAGE_KEY)) {
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY, firebaseUser.uid);
    subscribeSessionUser(firebaseUser.uid);
  });

  return () => {
    unsubscribeUserDoc();
    unsubscribeAuth();
  };
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
  const pinSalt = createSalt();
  const pinHash = await hashPin(pin, pinSalt);
  const usernameRef = doc(db, 'usernames', nicknameKey);
  const existingUsername = await getDoc(usernameRef);

  if (existingUsername.exists()) {
    throw new Error('이미 사용 중인 닉네임입니다.');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const usernameDoc = await transaction.get(usernameRef);

      if (usernameDoc.exists()) {
        throw new Error('이미 사용 중인 닉네임입니다.');
      }

      transaction.set(usernameRef, {
        uid: nicknameKey,
        nickname: normalizedNickname,
        createdAt: serverTimestamp(),
      });
      transaction.set(doc(db, 'users', nicknameKey), {
        nickname: normalizedNickname,
        nicknameKey,
        pinHash,
        pinSalt,
        profileImageUrl: '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (caughtError) {
    throw caughtError;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, nicknameKey);

  return {
    id: nicknameKey,
    isAdmin: false,
    nickname: normalizedNickname,
    profileImageUrl: '',
    status: 'pending',
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
    const nicknameKey = await getNicknameKey(normalizedNickname);
    const usernameDoc = await getDoc(doc(db, 'usernames', nicknameKey));

    if (!usernameDoc.exists()) {
      throw new Error('닉네임 또는 PIN이 일치하지 않습니다.');
    }

    const userId = usernameDoc.data().uid;
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    let appUser = publicUserFromDoc(userDoc);

    if (!appUser) {
      throw new Error('사용자 정보가 없습니다.');
    }

    if (appUser.status === 'deleted') {
      throw new Error('삭제 처리된 계정입니다.');
    }

    if (userData?.pinHash && userData?.pinSalt) {
      const enteredPinHash = await hashPin(pin, userData.pinSalt);

      if (enteredPinHash !== userData.pinHash) {
        throw new Error('닉네임 또는 PIN이 일치하지 않습니다.');
      }
    } else {
      const credential = await signInWithEmailAndPassword(auth, await getAuthEmail(normalizedNickname), pin);
      appUser = await getUserByUid(credential.user.uid);

      if (!appUser) {
        throw new Error('사용자 정보가 없습니다.');
      }
    }

    localStorage.setItem(SESSION_STORAGE_KEY, appUser.id);
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
  localStorage.removeItem(SESSION_STORAGE_KEY);
  return signOut(auth).catch(() => {});
}

export async function changeCurrentUserPin(currentUser, { currentPin, newPin }) {
  requireFirebase();

  if (!currentUser?.id || !currentUser?.nickname) {
    throw new Error('로그인 정보가 없습니다.');
  }

  if (!validatePin(currentPin) || !validatePin(newPin)) {
    throw new Error('PIN은 숫자 6자리만 가능합니다.');
  }

  if (currentPin === newPin) {
    throw new Error('새 PIN은 현재 PIN과 다르게 입력해주세요.');
  }

  const userRef = doc(db, 'users', currentUser.id);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();

  if (!userDoc.exists()) {
    throw new Error('사용자 정보가 없습니다.');
  }

  if (userData?.pinHash && userData?.pinSalt) {
    const enteredPinHash = await hashPin(currentPin, userData.pinSalt);

    if (enteredPinHash !== userData.pinHash) {
      throw new Error('현재 PIN이 일치하지 않습니다.');
    }
  } else {
    await signInWithEmailAndPassword(auth, await getAuthEmail(currentUser.nickname), currentPin).catch(() => {
      throw new Error('현재 PIN이 일치하지 않습니다.');
    });
  }

  const pinSalt = createSalt();
  const pinHash = await hashPin(newPin, pinSalt);

  await updateDoc(userRef, {
    pinHash,
    pinSalt,
    temporaryPinIssuedAt: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function changeCurrentUserNickname(currentUser, nickname) {
  requireFirebase();
  const normalizedNickname = normalizeNickname(nickname);

  if (!currentUser?.id || !currentUser?.nickname) {
    throw new Error('로그인 정보가 없습니다.');
  }

  if (!normalizedNickname) {
    throw new Error('새 닉네임을 입력해주세요.');
  }

  const oldNickname = currentUser.nickname;
  const oldNicknameKey = currentUser.nicknameKey || await getNicknameKey(oldNickname);
  const nextNicknameKey = await getNicknameKey(normalizedNickname);

  if (oldNicknameKey === nextNicknameKey) {
    throw new Error('현재 닉네임과 다른 닉네임을 입력해주세요.');
  }

  await runTransaction(db, async (transaction) => {
    const userRef = doc(db, 'users', currentUser.id);
    const oldUsernameRef = doc(db, 'usernames', oldNicknameKey);
    const nextUsernameRef = doc(db, 'usernames', nextNicknameKey);
    const userDoc = await transaction.get(userRef);
    const nextUsernameDoc = await transaction.get(nextUsernameRef);

    if (!userDoc.exists()) {
      throw new Error('사용자 정보가 없습니다.');
    }

    const userData = userDoc.data();

    if (!userData.pinHash || !userData.pinSalt) {
      throw new Error('먼저 PIN 변경을 완료한 뒤 닉네임을 변경해주세요.');
    }

    if (nextUsernameDoc.exists() && nextUsernameDoc.data().uid !== currentUser.id) {
      throw new Error('이미 사용 중인 닉네임입니다.');
    }

    transaction.set(nextUsernameRef, {
      uid: currentUser.id,
      nickname: normalizedNickname,
      createdAt: serverTimestamp(),
    });
    transaction.delete(oldUsernameRef);
    transaction.update(userRef, {
      nickname: normalizedNickname,
      nicknameKey: nextNicknameKey,
      updatedAt: serverTimestamp(),
    });
  });

  const [profilesSnapshot, schedulesSnapshot, commentsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'profiles'), where('ownerId', '==', currentUser.id))),
    getDocs(collection(db, 'schedules')),
    getDocs(query(collection(db, 'scheduleComments'), where('ownerId', '==', currentUser.id))),
  ]);
  const batch = writeBatch(db);

  profilesSnapshot.docs.forEach((profileDoc) => {
    batch.update(profileDoc.ref, {
      ownerNickname: normalizedNickname,
      updatedAt: serverTimestamp(),
    });
  });

  schedulesSnapshot.docs.forEach((scheduleDoc) => {
    const schedule = scheduleDoc.data();
    const updates = {};

    if (schedule.ownerId === currentUser.id) {
      updates.ownerNickname = normalizedNickname;
    }

    if (Array.isArray(schedule.participants)) {
      const participantIds = Array.isArray(schedule.participantIds) ? schedule.participantIds : [];
      const participants = schedule.participants.map((participant, index) => (
        participantIds[index] === currentUser.id || participant === oldNickname
          ? normalizedNickname
          : participant
      ));

      if (participants.some((participant, index) => participant !== schedule.participants[index])) {
        updates.participants = participants;
      }
    }

    if (Object.keys(updates).length > 0) {
      batch.update(scheduleDoc.ref, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    }
  });

  commentsSnapshot.docs.forEach((commentDoc) => {
    batch.update(commentDoc.ref, {
      ownerNickname: normalizedNickname,
    });
  });

  await batch.commit();
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

export async function uploadProfileImage(imageFile) {
  if (!imageFile?.type?.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  if (imageFile.size > PROFILE_IMAGE_MAX_BYTES) {
    throw new Error('프로필 이미지는 5MB 이하만 업로드할 수 있습니다.');
  }

  const image = await loadImageFromFile(imageFile);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const size = getResizedImageSize(image.naturalWidth, image.naturalHeight);

  canvas.width = size.width;
  canvas.height = size.height;
  context.drawImage(image, 0, 0, size.width, size.height);

  for (const quality of PROFILE_IMAGE_QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    if (dataUrl.length <= PROFILE_IMAGE_MAX_DATA_URL_LENGTH) {
      return dataUrl;
    }
  }

  throw new Error('이미지를 충분히 작게 압축하지 못했습니다. 더 작은 이미지로 다시 시도해주세요.');
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

export function subscribeScheduleComments(callback, onError) {
  const commentsQuery = query(getCollection('scheduleComments'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    commentsQuery,
    (snapshot) => {
      const comments = snapshot.docs.map((commentDoc) => ({
        id: commentDoc.id,
        ...commentDoc.data(),
      }));
      callback(comments);
    },
    onError,
  );
}

export function subscribeUsers(callback, onError) {
  return onSnapshot(
    getCollection('users'),
    (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          ...userDoc.data(),
          role: String(userDoc.data().role ?? '').trim().toLowerCase(),
          status: userDoc.data().status ?? 'approved',
        }))
        .sort((firstUser, secondUser) => {
          const firstCreatedAt = firstUser.createdAt?.toMillis?.() ?? 0;
          const secondCreatedAt = secondUser.createdAt?.toMillis?.() ?? 0;
          return secondCreatedAt - firstCreatedAt;
        });
      callback(users);
    },
    onError,
  );
}

export function approveUser(userId) {
  requireFirebase();
  return updateDoc(doc(db, 'users', userId), {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteUserAccount(user) {
  requireFirebase();
  const nicknameKey = user.nicknameKey || (user.nickname ? await getNicknameKey(user.nickname) : '');

  const [profilesSnapshot, schedulesSnapshot, commentsSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'profiles'), where('ownerId', '==', user.id))),
    getDocs(collection(db, 'schedules')),
    getDocs(collection(db, 'scheduleComments')),
  ]);

  const ownedScheduleIds = new Set(
    schedulesSnapshot.docs
      .filter((scheduleDoc) => scheduleDoc.data().ownerId === user.id)
      .map((scheduleDoc) => scheduleDoc.id),
  );
  const batch = writeBatch(db);

  profilesSnapshot.docs.forEach((profileDoc) => {
    batch.delete(profileDoc.ref);
  });

  schedulesSnapshot.docs.forEach((scheduleDoc) => {
    const schedule = scheduleDoc.data();

    if (schedule.ownerId === user.id) {
      batch.delete(scheduleDoc.ref);
      return;
    }

    if (Array.isArray(schedule.participantIds) && schedule.participantIds.includes(user.id)) {
      batch.update(scheduleDoc.ref, {
        participantIds: schedule.participantIds.filter((participantId) => participantId !== user.id),
        participants: Array.isArray(schedule.participants)
          ? schedule.participants.filter((participant) => participant !== user.nickname)
          : [],
        updatedAt: serverTimestamp(),
      });
    }
  });

  commentsSnapshot.docs.forEach((commentDoc) => {
    const comment = commentDoc.data();

    if (comment.ownerId === user.id || ownedScheduleIds.has(comment.scheduleId)) {
      batch.delete(commentDoc.ref);
    }
  });

  batch.delete(doc(db, 'users', user.id));

  if (nicknameKey) {
    batch.delete(doc(db, 'usernames', nicknameKey));
  }

  await batch.commit();
}

export async function issueTemporaryPin(userId) {
  requireFirebase();
  const temporaryPin = createTemporaryPin();
  const pinSalt = createSalt();
  const pinHash = await hashPin(temporaryPin, pinSalt);

  await updateDoc(doc(db, 'users', userId), {
    temporaryPinIssuedAt: serverTimestamp(),
    pinHash,
    pinSalt,
    updatedAt: serverTimestamp(),
  });

  return temporaryPin;
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

export function createScheduleComment(scheduleId, message, currentUser) {
  requireFirebase();
  const normalizedMessage = message.trim().replace(/\s+/g, ' ');

  if (!normalizedMessage) {
    throw new Error('댓글 내용을 입력해주세요.');
  }

  if (normalizedMessage.length > 160) {
    throw new Error('댓글은 160자 이하로 입력해주세요.');
  }

  return addDoc(getCollection('scheduleComments'), {
    scheduleId,
    message: normalizedMessage,
    ownerId: currentUser.id,
    ownerNickname: currentUser.nickname,
    createdAt: serverTimestamp(),
  });
}

export function deleteScheduleComment(commentId) {
  requireFirebase();
  return deleteDoc(doc(db, 'scheduleComments', commentId));
}
