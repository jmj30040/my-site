import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

function getCollection(collectionName) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return collection(db, collectionName);
}

export function subscribeProfiles(callback, onError) {
  const usersCollection = getCollection('users');
  const profilesQuery = query(usersCollection, orderBy('createdAt', 'desc'));

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

export function createProfile(profile) {
  const usersCollection = getCollection('users');

  return addDoc(usersCollection, {
    ...profile,
    createdAt: serverTimestamp(),
  });
}

export function updateProfile(id, profile) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return updateDoc(doc(db, 'users', id), profile);
}

export function deleteProfile(id) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return deleteDoc(doc(db, 'users', id));
}

export function subscribeSchedules(callback, onError) {
  const schedulesCollection = getCollection('schedules');

  return onSnapshot(
    schedulesCollection,
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

export function createSchedule(schedule) {
  const schedulesCollection = getCollection('schedules');

  return addDoc(schedulesCollection, {
    ...schedule,
    participants: schedule.participants ?? [],
    createdAt: serverTimestamp(),
  });
}

export function updateSchedule(id, schedule) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return updateDoc(doc(db, 'schedules', id), schedule);
}

export function deleteSchedule(id) {
  if (!db) {
    throw new Error('Firebase 환경변수가 설정되지 않았습니다.');
  }

  return deleteDoc(doc(db, 'schedules', id));
}

export function joinSchedule(schedule, nickname) {
  if (!nickname || schedule.participants?.includes(nickname)) {
    return Promise.resolve();
  }

  return updateSchedule(schedule.id, {
    participants: [...(schedule.participants ?? []), nickname],
  });
}

export function leaveSchedule(schedule, nickname) {
  return updateSchedule(schedule.id, {
    participants: (schedule.participants ?? []).filter((participant) => participant !== nickname),
  });
}
