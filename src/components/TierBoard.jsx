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
import { db, isFirebaseConfigured } from "../firebase.js";
import FirebaseNotice from "./FirebaseNotice.jsx";

const tiers = [1, 2, 3, 4, 5];

const tierStyles = {
  1: {
    label: "1티어",
    panel: "border-yellow-300/40 bg-yellow-300/10",
    badge: "bg-yellow-300 text-slate-950"
  },
  2: {
    label: "2티어",
    panel: "border-purple-300/40 bg-purple-400/10",
    badge: "bg-purple-300 text-slate-950"
  },
  3: {
    label: "3티어",
    panel: "border-sky-300/40 bg-sky-400/10",
    badge: "bg-sky-300 text-slate-950"
  },
  4: {
    label: "4티어",
    panel: "border-slate-300/30 bg-slate-300/10",
    badge: "bg-slate-300 text-slate-950"
  },
  5: {
    label: "5티어",
    panel: "border-slate-600/50 bg-slate-800/40",
    badge: "bg-slate-600 text-slate-100"
  }
};

function TierBoard({ isAdmin }) {
  const [users, setUsers] = useState([]);
  const [nickname, setNickname] = useState("");
  const [tier, setTier] = useState(3);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    // users 컬렉션을 실시간으로 구독해서 모든 친구에게 같은 티어표를 보여줍니다.
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextUsers = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));

      setUsers(
        nextUsers.sort((a, b) => {
          const tierDiff = Number(a.tier) - Number(b.tier);
          return tierDiff || String(a.nickname).localeCompare(String(b.nickname), "ko");
        })
      );
    });

    return unsubscribe;
  }, []);

  const groupedUsers = useMemo(() => {
    return tiers.reduce((groups, currentTier) => {
      groups[currentTier] = users.filter((user) => Number(user.tier) === currentTier);
      return groups;
    }, {});
  }, [users]);

  async function handleAddUser(event) {
    event.preventDefault();

    if (!isFirebaseConfigured || !isAdmin || !nickname.trim()) return;

    await addDoc(collection(db, "users"), {
      nickname: nickname.trim(),
      tier: Number(tier),
      memo: memo.trim(),
      updatedAt: serverTimestamp()
    });

    setNickname("");
    setTier(3);
    setMemo("");
  }

  async function handleUpdateUser(userId, nextFields) {
    if (!isFirebaseConfigured || !isAdmin) return;

    await updateDoc(doc(db, "users", userId), {
      ...nextFields,
      updatedAt: serverTimestamp()
    });
  }

  async function handleDeleteUser(user) {
    if (!isFirebaseConfigured || !isAdmin) return;

    const ok = confirm(`${user.nickname} 유저를 삭제할까요?`);
    if (!ok) return;

    await deleteDoc(doc(db, "users", user.id));
  }

  return (
    <div className="grid gap-5">
      {!isFirebaseConfigured && <FirebaseNotice />}

      <section className="rounded-2xl border border-white/10 bg-ow-panel/90 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-ow-orange">
              Squad Tiers
            </p>
            <h2 className="mt-2 text-2xl font-black">사용자 티어 보드</h2>
            <p className="mt-2 text-sm text-slate-400">
              관리자가 친구들의 숫자 티어와 메모를 설정합니다. 일반 사용자는 조회만 가능합니다.
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">
            총 {users.length}명
          </span>
        </div>

        {isAdmin && (
          <form className="mt-5 grid gap-3 lg:grid-cols-[1fr_140px_1.5fr_auto]" onSubmit={handleAddUser}>
            <input
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition placeholder:text-slate-600 focus:border-ow-orange focus:ring-4"
              placeholder="닉네임"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            <select
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition focus:border-ow-orange focus:ring-4"
              value={tier}
              onChange={(event) => setTier(event.target.value)}
            >
              {tiers.map((item) => (
                <option key={item} value={item}>
                  {item}티어
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none ring-ow-orange/30 transition placeholder:text-slate-600 focus:border-ow-orange focus:ring-4"
              placeholder="메모"
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
            />
            <button
              className="rounded-xl bg-ow-orange px-5 py-3 text-sm font-black text-slate-950 transition hover:brightness-110"
              type="submit"
            >
              유저 추가
            </button>
          </form>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {tiers.map((currentTier) => (
          <div
            key={currentTier}
            className={`rounded-2xl border p-4 ${tierStyles[currentTier].panel}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-black">{tierStyles[currentTier].label}</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${tierStyles[currentTier].badge}`}>
                {groupedUsers[currentTier]?.length || 0}
              </span>
            </div>

            <div className="mt-4 grid gap-3">
              {groupedUsers[currentTier]?.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                  아직 유저 없음
                </p>
              )}

              {groupedUsers[currentTier]?.map((user) => (
                <article key={user.id} className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black">{user.nickname}</h4>
                      <p className="text-xs font-bold text-slate-500">{user.tier}티어</p>
                    </div>
                    {isAdmin && (
                      <button
                        className="rounded-lg bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 transition hover:bg-red-400/20"
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                      >
                        삭제
                      </button>
                    )}
                  </div>

                  {isAdmin ? (
                    <div className="mt-3 grid gap-2">
                      <select
                        className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none"
                        value={user.tier}
                        onChange={(event) =>
                          handleUpdateUser(user.id, { tier: Number(event.target.value) })
                        }
                      >
                        {tiers.map((item) => (
                          <option key={item} value={item}>
                            {item}티어
                          </option>
                        ))}
                      </select>
                      <textarea
                        className="min-h-20 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-600"
                        placeholder="메모"
                        value={user.memo || ""}
                        onChange={(event) =>
                          handleUpdateUser(user.id, { memo: event.target.value })
                        }
                      />
                    </div>
                  ) : (
                    <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">
                      {user.memo || "메모 없음"}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default TierBoard;
