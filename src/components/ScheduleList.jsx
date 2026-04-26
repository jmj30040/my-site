import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase.js";

const emptyForm = {
  title: "",
  date: "",
  time: "",
  memo: ""
};

function getLocalDateString() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function sortSchedules(schedules) {
  return [...schedules].sort((a, b) => {
    const first = `${a.date}T${a.time || "00:00"}`;
    const second = `${b.date}T${b.time || "00:00"}`;
    return first.localeCompare(second);
  });
}

function ScheduleList({ nickname, isAdmin }) {
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");

  useEffect(() => {
    // schedules 컬렉션을 실시간 구독합니다. 정렬은 클라이언트에서 처리해 인덱스 설정 부담을 줄입니다.
    const unsubscribe = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const nextSchedules = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));
      setSchedules(sortSchedules(nextSchedules));
    });

    return unsubscribe;
  }, []);

  const today = getLocalDateString();
  const { todaySchedules, upcomingSchedules, pastSchedules } = useMemo(() => {
    return {
      todaySchedules: schedules.filter((schedule) => schedule.date === today),
      upcomingSchedules: schedules.filter((schedule) => schedule.date > today),
      pastSchedules: schedules.filter((schedule) => schedule.date < today).reverse()
    };
  }, [schedules, today]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!nickname || !form.title.trim() || !form.date) return;

    const payload = {
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      memo: form.memo.trim()
    };

    if (editingId) {
      await updateDoc(doc(db, "schedules", editingId), payload);
    } else {
      await addDoc(collection(db, "schedules"), {
        ...payload,
        author: nickname,
        participants: [nickname],
        createdAt: serverTimestamp()
      });
    }

    resetForm();
  }

  function startEdit(schedule) {
    setEditingId(schedule.id);
    setForm({
      title: schedule.title || "",
      date: schedule.date || "",
      time: schedule.time || "",
      memo: schedule.memo || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(schedule) {
    const ok = confirm(`${schedule.title} 일정을 삭제할까요?`);
    if (!ok) return;

    await deleteDoc(doc(db, "schedules", schedule.id));
  }

  async function toggleParticipant(schedule) {
    if (!nickname) return;

    const participants = schedule.participants || [];
    const joined = participants.includes(nickname);
    const nextParticipants = joined
      ? participants.filter((participant) => participant !== nickname)
      : [...participants, nickname];

    await updateDoc(doc(db, "schedules", schedule.id), {
      participants: nextParticipants
    });
  }

  function canManage(schedule) {
    return isAdmin || schedule.author === nickname;
  }

  function ScheduleCard({ schedule }) {
    const participants = schedule.participants || [];
    const joined = participants.includes(nickname);

    return (
      <article className="rounded-2xl border border-white/10 bg-ow-card/90 p-4 shadow-lg">
        <div className="grid gap-3 sm:grid-cols-[90px_1fr]">
          <div className="rounded-xl border border-ow-orange/30 bg-ow-orange/10 p-3 text-center">
            <p className="text-xs font-black text-ow-orange">{schedule.date}</p>
            <p className="mt-2 text-2xl font-black text-slate-100">
              {schedule.time || "--:--"}
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="break-words text-lg font-black">{schedule.title}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  작성자: {schedule.author || "알 수 없음"}
                </p>
              </div>
              <button
                className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                  joined
                    ? "bg-ow-cyan text-slate-950"
                    : "border border-ow-cyan/40 bg-ow-cyan/10 text-ow-cyan hover:bg-ow-cyan/20"
                }`}
                type="button"
                onClick={() => toggleParticipant(schedule)}
              >
                {joined ? "참가 취소" : "참가"}
              </button>
            </div>

            {schedule.memo && (
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {schedule.memo}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {participants.length === 0 && (
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-500">
                  참가자 없음
                </span>
              )}
              {participants.map((participant) => (
                <span
                  key={participant}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300"
                >
                  {participant}
                </span>
              ))}
            </div>

            {canManage(schedule) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-black text-slate-200 transition hover:bg-white/15"
                  type="button"
                  onClick={() => startEdit(schedule)}
                >
                  수정
                </button>
                <button
                  className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20"
                  type="button"
                  onClick={() => handleDelete(schedule)}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[410px_1fr]">
      <section className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-ow-orange">
          Match Calendar
        </p>
        <h2 className="mt-2 text-2xl font-black">
          {editingId ? "일정 수정" : "게임 일정 생성"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          누구나 일정을 만들 수 있습니다. 수정과 삭제는 작성자 또는 관리자만 가능합니다.
        </p>

        <form className="mt-5 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold text-slate-300">
            제목
            <input
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition placeholder:text-slate-600 focus:border-ow-orange focus:ring-4"
              placeholder="예: 빠대 5인큐"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              날짜
              <input
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition focus:border-ow-orange focus:ring-4"
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              시간
              <input
                className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition focus:border-ow-orange focus:ring-4"
                type="time"
                value={form.time}
                onChange={(event) => updateField("time", event.target.value)}
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-slate-300">
            메모
            <textarea
              className="min-h-28 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition placeholder:text-slate-600 focus:border-ow-orange focus:ring-4"
              placeholder="역할 조합, 디스코드 채널, 목표 등을 적어주세요."
              value={form.memo}
              onChange={(event) => updateField("memo", event.target.value)}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <button
              className="rounded-xl bg-ow-orange px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!nickname}
            >
              {editingId ? "수정 저장" : "일정 생성"}
            </button>
            {editingId && (
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
                type="button"
                onClick={resetForm}
              >
                취소
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="grid gap-5">
        <div className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">오늘 일정</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
              {todaySchedules.length}개
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {todaySchedules.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
                오늘 일정이 없습니다.
              </p>
            )}
            {todaySchedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">예정 일정</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
              {upcomingSchedules.length}개
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {upcomingSchedules.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
                예정 일정이 없습니다.
              </p>
            )}
            {upcomingSchedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">지난 일정</h2>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
              {pastSchedules.length}개
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {pastSchedules.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
                지난 일정이 없습니다.
              </p>
            )}
            {pastSchedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default ScheduleList;
