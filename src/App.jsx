import { useEffect, useMemo, useState } from 'react';
import { AuthPanel } from './components/AuthPanel';
import { ProfileForm } from './components/ProfileForm';
import { ProfileList } from './components/ProfileList';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleList } from './components/ScheduleList';
import { ROLES, TIERS } from './constants';
import { isFirebaseConfigured, missingFirebaseConfigKeys } from './firebase';
import {
  createProfile,
  createSchedule,
  createScheduleComment,
  deleteScheduleComment,
  deleteProfile,
  deleteSchedule,
  joinSchedule,
  leaveSchedule,
  loginWithNickname,
  logout,
  signUpWithNickname,
  subscribeAuthUser,
  subscribeProfiles,
  subscribeScheduleComments,
  subscribeSchedules,
  updateProfile,
  updateSchedule,
  uploadProfileImage,
} from './services/firestore';

const PROFILE_SAVE_TIMEOUT_MS = 45000;

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

function App() {
  const [profiles, setProfiles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [scheduleComments, setScheduleComments] = useState([]);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [tierFilter, setTierFilter] = useState('전체');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [activeSection, setActiveSection] = useState('schedules');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSavingMessage, setProfileSavingMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return undefined;
    }

    const unsubscribeAuth = subscribeAuthUser((user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      return undefined;
    }

    let unsubscribeProfiles = () => {};
    let unsubscribeSchedules = () => {};
    let unsubscribeScheduleComments = () => {};

    try {
      const handleSubscriptionError = (caughtError) => {
        setError(`Firestore read error: ${caughtError.message}`);
      };

      unsubscribeProfiles = subscribeProfiles(setProfiles, handleSubscriptionError);
      unsubscribeSchedules = subscribeSchedules(setSchedules, handleSubscriptionError);
      unsubscribeScheduleComments = subscribeScheduleComments(setScheduleComments, handleSubscriptionError);
    } catch (caughtError) {
      setError(caughtError.message);
    }

    return () => {
      unsubscribeProfiles();
      unsubscribeSchedules();
      unsubscribeScheduleComments();
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

  const commentsBySchedule = useMemo(() => {
    return scheduleComments.reduce((groupedComments, comment) => {
      if (!comment.scheduleId) {
        return groupedComments;
      }

      return {
        ...groupedComments,
        [comment.scheduleId]: [...(groupedComments[comment.scheduleId] ?? []), comment],
      };
    }, {});
  }, [scheduleComments]);

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
    setIsAuthLoading(true);

    try {
      const user = await signUpWithNickname(authForm);
      setCurrentUser(user);
      setNotice(`${user.nickname}님, 회원가입과 로그인이 완료되었습니다.`);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (authForm) => {
    setError('');
    setNotice('');
    setIsAuthLoading(true);

    try {
      const user = await loginWithNickname(authForm);
      setCurrentUser(user);
      setNotice(`${user.nickname}님 로그인 중입니다.`);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setError('');

    try {
      await logout();
      setCurrentUser(null);
      setEditingProfile(null);
      setEditingSchedule(null);
      setNotice('로그아웃되었습니다.');
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleSubmitProfile = async (profile) => {
    setError('');
    setNotice('');

    if (!requireLogin()) {
      return false;
    }

    if (editingProfile && editingProfile.ownerId !== currentUser.id && !currentUser.isAdmin) {
      setError('본인이 등록한 프로필만 수정할 수 있습니다.');
      return false;
    }

    if (!editingProfile && myProfile) {
      setError('프로필은 계정당 하나만 생성할 수 있습니다. 기존 프로필을 수정해주세요.');
      return false;
    }

    setIsProfileSaving(true);
    setProfileSavingMessage('프로필 저장 준비 중...');

    try {
      await withTimeout(
        (async () => {
          const { profileImageFile, ...profileData } = profile;
          const profileToSave = { ...profileData };

          if (profileImageFile) {
            setProfileSavingMessage('이미지 압축 중...');
            profileToSave.profileImageUrl = await uploadProfileImage(profileImageFile);
          }

          setProfileSavingMessage('프로필 저장 중...');

          if (editingProfile) {
            await updateProfile(editingProfile.id, profileToSave);
            setEditingProfile(null);
          } else {
            await createProfile(profileToSave, currentUser);
          }
        })(),
        PROFILE_SAVE_TIMEOUT_MS,
        '프로필 저장 시간이 초과되었습니다. Firestore 권한과 네트워크 상태를 확인해주세요.',
      );
      setNotice('프로필이 저장되었습니다.');
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setIsProfileSaving(false);
      setProfileSavingMessage('');
    }
  };

  const handleSubmitSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      if (editingSchedule) {
        if (editingSchedule.ownerId !== currentUser.id && !currentUser.isAdmin) {
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

    if (profile.ownerId !== currentUser.id && !currentUser.isAdmin) {
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

    if (schedule.ownerId !== currentUser.id && !currentUser.isAdmin) {
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

  const handleAddScheduleComment = async (schedule, message) => {
    setError('');

    if (!requireLogin()) {
      return false;
    }

    try {
      await createScheduleComment(schedule.id, message, currentUser);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    }
  };

  const handleDeleteScheduleComment = async (comment) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    if (comment.ownerId !== currentUser.id && !currentUser.isAdmin) {
      setError('본인이 작성한 댓글만 삭제할 수 있습니다.');
      return;
    }

    try {
      await deleteScheduleComment(comment.id);
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
          <h1>올레PC존</h1>
          <p className="hero-copy">
            친구들과 빠르게 모이고, 편하게 같이 하는 커뮤니티
          </p>
        </div>
        <AuthPanel
          currentUser={currentUser}
          isAuthLoading={isAuthLoading}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSignUp={handleSignUp}
        />
      </section>

      {!currentUser && <p className="notice-message">로그인 후 프로필 설정과 일정 등록이 가능합니다.</p>}
      {notice && <p className="success-message">{notice}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="section-tabs" aria-label="콘텐츠 탭">
        <button
          aria-pressed={activeSection === 'schedules'}
          className={activeSection === 'schedules' ? 'active-tab' : ''}
          type="button"
          onClick={() => setActiveSection('schedules')}
        >
          일정
        </button>
        <button
          aria-pressed={activeSection === 'profiles'}
          className={activeSection === 'profiles' ? 'active-tab' : ''}
          type="button"
          onClick={() => setActiveSection('profiles')}
        >
          티어표
        </button>
      </div>

      <section className={`workspace tab-panel ${activeSection === 'profiles' ? 'active-panel' : ''}`}>
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
              isSubmitting={isProfileSaving}
              submittingLabel={profileSavingMessage}
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

      <section className={`workspace tab-panel ${activeSection === 'schedules' ? 'active-panel' : ''}`}>
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
            commentsBySchedule={commentsBySchedule}
            currentUser={currentUser}
            schedules={schedules}
            onAddComment={handleAddScheduleComment}
            onDeleteComment={handleDeleteScheduleComment}
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
