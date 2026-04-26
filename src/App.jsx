import { useEffect, useMemo, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { ProfileForm } from './components/ProfileForm';
import { ProfileList } from './components/ProfileList';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleList } from './components/ScheduleList';
import { ROLES, TIERS } from './constants';
import { isFirebaseConfigured, missingFirebaseConfigKeys } from './firebase';
import {
  clearUserSession,
  createProfile,
  createSchedule,
  deleteProfile,
  deleteSchedule,
  getStoredUser,
  joinSchedule,
  leaveSchedule,
  loginWithNickname,
  signUpWithNickname,
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
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    let unsubscribeProfiles = () => {};
    let unsubscribeSchedules = () => {};

    try {
      const handleSubscriptionError = (caughtError) => {
        setError(`Firestore read error: ${caughtError.message}`);
      };

      unsubscribeProfiles = subscribeProfiles(setProfiles, handleSubscriptionError);
      unsubscribeSchedules = subscribeSchedules(setSchedules, handleSubscriptionError);
    } catch (caughtError) {
      setError(caughtError.message);
    }

    return () => {
      unsubscribeProfiles();
      unsubscribeSchedules();
    };
  }, []);

  const myProfile = useMemo(() => {
    if (!currentUser) {
      return null;
    }

    return profiles.find((profile) => profile.ownerId === currentUser.id) ?? null;
  }, [currentUser, profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      const matchesTier = tierFilter === '전체' || profile.tier === tierFilter;
      const matchesRole = roleFilter === '전체' || profile.role === roleFilter;
      return matchesTier && matchesRole;
    });
  }, [profiles, roleFilter, tierFilter]);

  const requireLogin = () => {
    if (currentUser) {
      return true;
    }

    setError('로그인 후 프로필 설정과 일정 등록이 가능합니다.');
    return false;
  };

  const handleSignUp = async (authForm) => {
    setError('');
    setNotice('');

    try {
      const user = await signUpWithNickname(authForm);
      setCurrentUser(user);
      setNotice(`${user.nickname}님, 회원가입과 로그인이 완료되었습니다.`);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    }
  };

  const handleLogin = async (authForm) => {
    setError('');
    setNotice('');

    try {
      const user = await loginWithNickname(authForm);
      setCurrentUser(user);
      setNotice(`${user.nickname}님 로그인 중입니다.`);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    }
  };

  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
    setEditingProfile(null);
    setEditingSchedule(null);
    setNotice('로그아웃되었습니다.');
  };

  const handleSubmitProfile = async (profile) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      if (editingProfile) {
        if (editingProfile.ownerId !== currentUser.id) {
          setError('본인이 등록한 프로필만 수정할 수 있습니다.');
          return;
        }

        await updateProfile(editingProfile.id, profile);
        setEditingProfile(null);
      } else {
        if (myProfile) {
          setError('프로필은 계정당 하나만 생성할 수 있습니다. 기존 프로필을 수정해주세요.');
          return;
        }

        await createProfile(profile, currentUser);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleSubmitSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      if (editingSchedule) {
        if (editingSchedule.ownerId !== currentUser.id) {
          setError('본인이 등록한 일정만 수정할 수 있습니다.');
          return;
        }

        await updateSchedule(editingSchedule.id, schedule);
        setEditingSchedule(null);
      } else {
        await createSchedule(schedule, currentUser);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleDeleteProfile = async (profile) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    if (profile.ownerId !== currentUser.id) {
      setError('본인이 등록한 프로필만 삭제할 수 있습니다.');
      return;
    }

    if (window.confirm('이 프로필을 삭제할까요?')) {
      await deleteProfile(profile.id);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    if (schedule.ownerId !== currentUser.id) {
      setError('본인이 등록한 일정만 삭제할 수 있습니다.');
      return;
    }

    if (window.confirm('이 일정을 삭제할까요?')) {
      await deleteSchedule(schedule.id);
    }
  };

  const handleJoinSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      await joinSchedule(schedule, currentUser);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleLeaveSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      await leaveSchedule(schedule, currentUser);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <main className="app-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Firebase Setup</p>
            <h1>Firebase 환경변수가 필요합니다</h1>
          </div>
          <div className="setup-box">
            <p>GitHub Pages 배포 환경에 아래 값이 없습니다.</p>
            <code>{missingFirebaseConfigKeys.join(', ')}</code>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Overwatch Friends</p>
          <h1>친구들과 빠르게 모이고, 편하게 같이 하는 커뮤니티</h1>
          <p className="hero-copy">닉네임과 4자리 PIN으로 간단히 로그인하고 프로필과 일정을 공유하세요.</p>
        </div>
        <AuthPanel currentUser={currentUser} onLogin={handleLogin} onLogout={handleLogout} onSignUp={handleSignUp} />
      </section>

      {!currentUser && <p className="notice-message">로그인 후 프로필 설정과 일정 등록이 가능합니다.</p>}
      {notice && <p className="success-message">{notice}</p>}
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
          {currentUser ? (
            <ProfileForm
              key={editingProfile?.id ?? currentUser.id}
              currentUser={currentUser}
              initialProfile={editingProfile}
              onSubmit={handleSubmitProfile}
            />
          ) : (
            <p className="empty-state">로그인 후 내 프로필을 만들 수 있습니다.</p>
          )}
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
            currentUser={currentUser}
            profiles={filteredProfiles}
            onDelete={handleDeleteProfile}
            onEdit={setEditingProfile}
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
          {currentUser ? (
            <ScheduleForm
              key={editingSchedule?.id ?? 'new-schedule'}
              initialSchedule={editingSchedule}
              onSubmit={handleSubmitSchedule}
            />
          ) : (
            <p className="empty-state">로그인 후 게임 일정을 등록할 수 있습니다.</p>
          )}
        </div>

        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Party Queue</p>
              <h2>일정 목록</h2>
            </div>
          </div>
          <ScheduleList
            currentUser={currentUser}
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
