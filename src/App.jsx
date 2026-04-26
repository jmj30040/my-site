import { useEffect, useMemo, useState } from 'react';
import { ProfileForm } from './components/ProfileForm';
import { ProfileList } from './components/ProfileList';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleList } from './components/ScheduleList';
import { ROLES, TIERS } from './constants';
import {
  createProfile,
  createSchedule,
  deleteProfile,
  deleteSchedule,
  joinSchedule,
  leaveSchedule,
  subscribeProfiles,
  subscribeSchedules,
  updateProfile,
  updateSchedule,
} from './services/firestore';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [tierFilter, setTierFilter] = useState('전체');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [currentNickname, setCurrentNickname] = useState(() => localStorage.getItem('owNickname') ?? '');
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribeProfiles = subscribeProfiles(setProfiles);
    const unsubscribeSchedules = subscribeSchedules(setSchedules);

    return () => {
      unsubscribeProfiles();
      unsubscribeSchedules();
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesTier = tierFilter === '전체' || profile.tier === tierFilter;
      const matchesRole = roleFilter === '전체' || profile.role === roleFilter;
      return matchesTier && matchesRole;
    });
  }, [profiles, roleFilter, tierFilter]);

  const handleSaveNickname = (event) => {
    event.preventDefault();
    const trimmedNickname = nicknameInput.trim();
    setCurrentNickname(trimmedNickname);
    localStorage.setItem('owNickname', trimmedNickname);
  };

  const handleSubmitProfile = async (profile) => {
    setError('');
    try {
      if (editingProfile) {
        await updateProfile(editingProfile.id, profile);
        setEditingProfile(null);
      } else {
        await createProfile(profile);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleSubmitSchedule = async (schedule) => {
    setError('');
    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, schedule);
        setEditingSchedule(null);
      } else {
        await createSchedule(schedule);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleDeleteProfile = async (id) => {
    if (window.confirm('이 프로필을 삭제할까요?')) {
      await deleteProfile(id);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('이 일정을 삭제할까요?')) {
      await deleteSchedule(id);
    }
  };

  const handleJoinSchedule = async (schedule) => {
    if (!currentNickname) {
      setError('먼저 상단에서 내 닉네임을 저장해주세요.');
      return;
    }
    await joinSchedule(schedule, currentNickname);
  };

  const handleLeaveSchedule = async (schedule) => {
    if (!currentNickname) {
      setError('먼저 상단에서 내 닉네임을 저장해주세요.');
      return;
    }
    await leaveSchedule(schedule, currentNickname);
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Overwatch Friends</p>
          <h1>친구들과 빠르게 모이고, 편하게 같이 하는 MVP 커뮤니티</h1>
        </div>
        <form className="nickname-box" onSubmit={handleSaveNickname}>
          <label htmlFor="nickname">내 닉네임</label>
          <div className="inline-form">
            <input
              id="nickname"
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              placeholder="예: Hana"
            />
            <button type="submit">저장</button>
          </div>
          {currentNickname && <span className="saved-name">{currentNickname}으로 참여 중</span>}
        </form>
      </section>

      {error && <p className="error-message">{error}</p>}

      <section className="workspace">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Profiles</p>
              <h2>친구 프로필</h2>
            </div>
            {editingProfile && (
              <button className="ghost-button" onClick={() => setEditingProfile(null)}>
                작성 취소
              </button>
            )}
          </div>
          <ProfileForm
            key={editingProfile?.id ?? 'new-profile'}
            initialProfile={editingProfile}
            onSubmit={handleSubmitProfile}
          />
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Find Friends</p>
              <h2>프로필 목록</h2>
            </div>
          </div>
          <div className="filters">
            <select value={tierFilter} onChange={(event) => setTierFilter(event.target.value)}>
              <option value="전체">티어 전체</option>
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="전체">역할 전체</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <ProfileList
            profiles={filteredProfiles}
            onEdit={setEditingProfile}
            onDelete={handleDeleteProfile}
          />
        </div>
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Schedules</p>
              <h2>게임 일정</h2>
            </div>
            {editingSchedule && (
              <button className="ghost-button" onClick={() => setEditingSchedule(null)}>
                작성 취소
              </button>
            )}
          </div>
          <ScheduleForm
            key={editingSchedule?.id ?? 'new-schedule'}
            initialSchedule={editingSchedule}
            onSubmit={handleSubmitSchedule}
          />
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Party Queue</p>
              <h2>일정 목록</h2>
            </div>
          </div>
          <ScheduleList
            currentNickname={currentNickname}
            schedules={schedules}
            onDelete={handleDeleteSchedule}
            onEdit={setEditingSchedule}
            onJoin={handleJoinSchedule}
            onLeave={handleLeaveSchedule}
          />
        </div>
      </section>
    </main>
  );
}

export default App;
