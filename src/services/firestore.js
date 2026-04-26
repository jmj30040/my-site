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

const usersCollection = collection(db, 'users');
const schedulesCollection = collection(db, 'schedules');

export function subscribeProfiles(callback) {
  const profilesQuery = query(usersCollection, orderBy('createdAt', 'desc'));

  return onSnapshot(profilesQuery, (snapshot) => {
    const profiles = snapshot.docs.map((profileDoc) => ({
      id: profileDoc.id,
      ...profileDoc.data(),
    }));
    callback(profiles);
  });
}

export function createProfile(profile) {
  return addDoc(usersCollection, {
    ...profile,
    createdAt: serverTimestamp(),
  });
}

export function updateProfile(id, profile) {
  return updateDoc(doc(db, 'users', id), profile);
}

export function deleteProfile(id) {
  return deleteDoc(doc(db, 'users', id));
}

export function subscribeSchedules(callback) {
  const schedulesQuery = query(schedulesCollection, orderBy('date'), orderBy('startTime'));

  return onSnapshot(schedulesQuery, (snapshot) => {
    const schedules = snapshot.docs.map((scheduleDoc) => ({
      id: scheduleDoc.id,
      ...scheduleDoc.data(),
    }));
    callback(schedules);
  });
}

export function createSchedule(schedule) {
  return addDoc(schedulesCollection, {
    ...schedule,
    participants: schedule.participants ?? [],
    createdAt: serverTimestamp(),
  });
}

export function updateSchedule(id, schedule) {
  return updateDoc(doc(db, 'schedules', id), schedule);
}

export function deleteSchedule(id) {
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
