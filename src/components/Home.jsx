import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

const tierStyles = {
  1: "border-yellow-300/50 bg-yellow-300/10 text-yellow-200",
  2: "border-purple-300/50 bg-purple-400/10 text-purple-200",
  3: "border-sky-300/50 bg-sky-400/10 text-sky-200",
  4: "border-slate-300/40 bg-slate-300/10 text-slate-200",
  5: "border-slate-600/60 bg-slate-700/30 text-slate-300"
};

function getLocalDateString() {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function Home({ nickname, isAdmin, setActiveTab }) {
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    // 홈에서는 사용자와 일정을 모두 실시간으로 구독해 요약 정보를 보여줍니다.
    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(nextUsers.sort((a, b) => Number(a.tier) - Number(b.tier)));
    });

    const unsubscribeSchedules = onSnapshot(collection(db, "schedules"), (snapshot) => {
      const nextSchedules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSchedules(
        nextSchedules.sort((a, b) =>
          `${a.date}T${a.time || "00:00"}`.localeCompare(`${b.date}T${b.time || "00:00"}`)
        )
      );
    });

    return () => {
      unsubscribeUsers();
      unsubscribeSchedules();
    };
  }, []);

  const today = getLocalDateString();
  const todaySchedules = schedules.filter((schedule) => schedule.date === today);
  const topUsers = useMemo(
    () => users.filter((user) => Number(user.tier) <= 2).slice(0, 6),
    [users]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 shadow-glow sm:p-7">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-ow-orange">
          Ready Check
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
          오늘 모일 스쿼드를 한눈에.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
          닉네임은 <span className="font-bold text-slate-200">{nickname || "미설정"}</span>
          으로 표시됩니다. 관리자 모드가 켜져 있으면 티어와 일정 관리를 할 수 있습니다.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <button
            className="rounded-xl bg-ow-orange px-4 py-4 text-left font-black text-slate-950 transition hover:brightness-110"
            type="button"
            onClick={() => setActiveTab("schedules")}
          >
            일정 만들기
            <span className="block text-xs font-bold opacity-70">참가자 실시간 공유</span>
          </button>
          <button
            className="rounded-xl border border-ow-cyan/30 bg-ow-cyan/10 px-4 py-4 text-left font-black text-ow-cyan transition hover:bg-ow-cyan/20"
            type="button"
            onClick={() => setActiveTab("tiers")}
          >
            티어 보기
            <span className="block text-xs font-bold opacity-70">1티어부터 정렬</span>
          </button>
          <div className="rounded-xl border border-white/10 bg-slate-950/55 px-4 py-4">
            <p className="text-sm font-bold text-slate-400">관리자 상태</p>
            <p className={isAdmin ? "font-black text-ow-orange" : "font-black text-slate-300"}>
              {isAdmin ? "ON" : "OFF"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">오늘 일정</h2>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">
            {today}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          {todaySchedules.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400">
              오늘 등록된 일정이 없습니다.
            </div>
          )}

          {todaySchedules.map((schedule) => (
            <article key={schedule.id} className="rounded-xl bg-slate-950/55 p-4">
              <p className="text-sm font-black text-ow-orange">{schedule.time || "시간 미정"}</p>
              <h3 className="mt-1 font-black">{schedule.title}</h3>
              <p className="mt-2 text-sm text-slate-400">
                참가 {schedule.participants?.length || 0}명
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">상위 티어 유저</h2>
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10"
            type="button"
            onClick={() => setActiveTab("tiers")}
          >
            전체 보기
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topUsers.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/15 p-5 text-sm text-slate-400 sm:col-span-2 lg:col-span-3">
              아직 1~2티어 유저가 없습니다.
            </div>
          )}

          {topUsers.map((user) => (
            <article
              key={user.id}
              className={`rounded-xl border p-4 ${tierStyles[user.tier] || tierStyles[5]}`}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em]">Tier {user.tier}</p>
              <h3 className="mt-2 text-lg font-black">{user.nickname}</h3>
              <p className="mt-2 min-h-10 text-sm opacity-80">{user.memo || "메모 없음"}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
