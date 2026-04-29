import { useCallback, useEffect, useState } from 'react';
import { AdminUserPanel } from './components/AdminUserPanel';
import { AuthPanel } from './components/AuthPanel';
import { ChatPanel } from './components/ChatPanel';
import { ProfileForm } from './components/ProfileForm';
import { ProfileList } from './components/ProfileList';
import { ScheduleForm } from './components/ScheduleForm';
import { ScheduleList } from './components/ScheduleList';
import { ROLES, TIERS } from './constants';
import { isFirebaseConfigured, missingFirebaseConfigKeys } from './firebase';
import {
  createProfile,
  createSchedule,
  changeCurrentUserNickname,
  changeCurrentUserPin,
  approveUser,
  createChatMessage,
  deleteProfile,
  deleteSchedule,
  fetchOlderChatMessages,
  fetchPastSchedulePage,
  fetchProfileByOwnerId,
  fetchProfilePage,
  joinSchedule,
  leaveSchedule,
  loginWithNickname,
  logout,
  deleteUserAccount,
  issueTemporaryPin,
  signUpWithNickname,
  subscribeAuthUser,
  subscribeChatMessages,
  subscribeLatestContentDates,
  subscribeSchedules,
  subscribeUsers,
  updateProfile,
  updateSchedule,
  uploadProfileImage,
} from './services/firestore';
import { isScheduleClosed } from './utils/scheduleStatus';

const PROFILE_SAVE_TIMEOUT_MS = 45000;
const PROFILE_PAGE_SIZE = 5;

function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isToday(value) {
  const date = toDate(value);

  if (!date) {
    return false;
  }

  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
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

function App() {
  const [profiles, setProfiles] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [pastSchedules, setPastSchedules] = useState([]);
  const [pastScheduleCursor, setPastScheduleCursor] = useState(null);
  const [hasMorePastSchedules, setHasMorePastSchedules] = useState(false);
  const [isPastSchedulesOpen, setIsPastSchedulesOpen] = useState(false);
  const [isPastScheduleLoading, setIsPastScheduleLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [olderChatMessages, setOlderChatMessages] = useState([]);
  const [hasMoreChatMessages, setHasMoreChatMessages] = useState(false);
  const [isLoadingOlderChatMessages, setIsLoadingOlderChatMessages] = useState(false);
  const [latestContentDates, setLatestContentDates] = useState({ chat: null, profiles: null, schedules: null });
  const [users, setUsers] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [isProfileFormOpen, setIsProfileFormOpen] = useState(false);
  const [isScheduleFormOpen, setIsScheduleFormOpen] = useState(false);
  const [tierFilter, setTierFilter] = useState('전체');
  const [roleFilter, setRoleFilter] = useState('전체');
  const [profileSearchDraft, setProfileSearchDraft] = useState('');
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [profileCursor, setProfileCursor] = useState(null);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(false);
  const [isProfileListLoading, setIsProfileListLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('schedules');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSavingMessage, setProfileSavingMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [temporaryPinNotice, setTemporaryPinNotice] = useState(null);

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
    if (!isFirebaseConfigured || !currentUser) {
      setProfiles([]);
      setSchedules([]);
      setPastSchedules([]);
      setPastScheduleCursor(null);
      setHasMorePastSchedules(false);
      setIsPastSchedulesOpen(false);
      setChatMessages([]);
      setOlderChatMessages([]);
      setHasMoreChatMessages(false);
      setUsers([]);
      setMyProfile(null);
      setProfileCursor(null);
      setHasMoreProfiles(false);
      return undefined;
    }

    let unsubscribeSchedules = () => {};
    let unsubscribeUsers = () => {};

    try {
      const handleSubscriptionError = (caughtError) => {
        setError(`Firestore read error: ${caughtError.message}`);
      };

      unsubscribeSchedules = subscribeSchedules(setSchedules, handleSubscriptionError);
      if (currentUser.isAdmin) {
        unsubscribeUsers = subscribeUsers(setUsers, handleSubscriptionError);
      } else {
        setUsers([]);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }

    return () => {
      unsubscribeSchedules();
      unsubscribeUsers();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      setLatestContentDates({ chat: null, profiles: null, schedules: null });
      return undefined;
    }

    const handleSubscriptionError = (caughtError) => {
      setError(`Firestore read error: ${caughtError.message}`);
    };

    try {
      return subscribeLatestContentDates(setLatestContentDates, handleSubscriptionError);
    } catch (caughtError) {
      setError(caughtError.message);
      return undefined;
    }
  }, [currentUser]);

  const loadProfiles = useCallback(async ({ reset = false } = {}) => {
    if (!isFirebaseConfigured || !currentUser) {
      return;
    }

    setError('');
    setIsProfileListLoading(true);

    try {
      const result = await fetchProfilePage({
        cursor: reset ? null : profileCursor,
        pageSize: PROFILE_PAGE_SIZE,
        role: roleFilter,
        searchTerm: profileSearchTerm,
        tier: tierFilter,
      });

      setProfiles((currentProfiles) => (reset ? result.profiles : [...currentProfiles, ...result.profiles]));
      setProfileCursor(result.cursor);
      setHasMoreProfiles(result.hasMore);
    } catch (caughtError) {
      setError(`Firestore read error: ${caughtError.message}`);
    } finally {
      setIsProfileListLoading(false);
    }
  }, [currentUser, profileCursor, profileSearchTerm, roleFilter, tierFilter]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      return;
    }

    setProfiles([]);
    setProfileCursor(null);
    setHasMoreProfiles(false);
    loadProfiles({ reset: true });
  }, [currentUser, profileSearchTerm, roleFilter, tierFilter]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      setMyProfile(null);
      return;
    }

    let isActive = true;

    fetchProfileByOwnerId(currentUser.id)
      .then((profile) => {
        if (isActive) {
          setMyProfile(profile);
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setError(`Firestore read error: ${caughtError.message}`);
        }
      });

    return () => {
      isActive = false;
    };
  }, [currentUser]);

  const refreshMyProfile = useCallback(async () => {
    if (!isFirebaseConfigured || !currentUser) {
      setMyProfile(null);
      return;
    }

    setMyProfile(await fetchProfileByOwnerId(currentUser.id));
  }, [currentUser]);

  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser || activeSection !== 'chat') {
      setChatMessages([]);
      setOlderChatMessages([]);
      setHasMoreChatMessages(false);
      return undefined;
    }

    const handleSubscriptionError = (caughtError) => {
      setError(`Firestore read error: ${caughtError.message}`);
    };

    try {
      return subscribeChatMessages((messages) => {
        setChatMessages(messages);
        setOlderChatMessages((currentMessages) => (
          currentMessages.filter((message) => !messages.some((liveMessage) => liveMessage.id === message.id))
        ));
        setHasMoreChatMessages(messages.length >= 20);
      }, handleSubscriptionError);
    } catch (caughtError) {
      setError(caughtError.message);
      return undefined;
    }
  }, [activeSection, currentUser]);

  useEffect(() => {
    if (activeSection === 'admin' && !currentUser?.isAdmin) {
      setActiveSection('schedules');
    }
  }, [activeSection, currentUser]);

  const isApprovedUser = Boolean(currentUser && (currentUser.status === 'approved' || currentUser.isAdmin));
  const newContentBySection = {
    chat: isToday(latestContentDates.chat),
    profiles: isToday(latestContentDates.profiles),
    schedules: isToday(latestContentDates.schedules),
  };

  const requireLogin = () => {
    if (isApprovedUser) {
      return true;
    }

    if (currentUser?.status === 'pending') {
      setError('관리자 승인 후 이용할 수 있습니다.');
      return false;
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
      setNotice(`${user.nickname}님, 가입 신청이 완료되었습니다. 관리자 승인 후 이용할 수 있습니다.`);
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
      setNotice(
        user.status === 'pending'
          ? `${user.nickname}님, 관리자 승인 대기 중입니다.`
          : `${user.nickname}님 로그인 중입니다.`,
      );
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
      setIsProfileFormOpen(false);
      setIsScheduleFormOpen(false);
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

          setIsProfileFormOpen(false);
        })(),
        PROFILE_SAVE_TIMEOUT_MS,
        '프로필 저장 시간이 초과되었습니다. Firestore 권한과 네트워크 상태를 확인해주세요.',
      );
      await Promise.all([
        refreshMyProfile(),
        loadProfiles({ reset: true }),
      ]);
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

  const handleChangePin = async (pinForm) => {
    setError('');
    setNotice('');
    setTemporaryPinNotice(null);
    setIsAuthLoading(true);

    try {
      await changeCurrentUserPin(currentUser, pinForm);
      setNotice('PIN이 변경되었습니다. 다음 로그인부터 새 PIN을 사용해주세요.');
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleChangeNickname = async (nickname) => {
    setError('');
    setNotice('');
    setTemporaryPinNotice(null);
    setIsAuthLoading(true);

    try {
      await changeCurrentUserNickname(currentUser, nickname);
      setNotice('닉네임이 변경되었습니다. 다음 로그인부터 새 닉네임을 사용해주세요.');
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSubmitSchedule = async (schedule) => {
    setError('');

    if (!requireLogin()) {
      return;
    }

    try {
      if (editingSchedule) {
        if (isScheduleClosed(editingSchedule)) {
          setError('마감된 일정은 수정할 수 없습니다.');
          return;
        }

        if (editingSchedule.ownerId !== currentUser.id && !currentUser.isAdmin) {
          setError('본인이 등록한 일정만 수정할 수 있습니다.');
          return;
        }

        await updateSchedule(editingSchedule.id, schedule);
        setEditingSchedule(null);
      } else {
        await createSchedule(schedule, currentUser);
      }

      setIsScheduleFormOpen(false);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleOpenProfileForm = () => {
    setEditingProfile(myProfile);
    setIsProfileFormOpen(true);
  };

  const handleEditProfile = (profile) => {
    setEditingProfile(profile);
    setIsProfileFormOpen(true);
  };

  const handleCloseProfileForm = () => {
    setEditingProfile(null);
    setIsProfileFormOpen(false);
  };

  const handleProfileSearchSubmit = (event) => {
    event.preventDefault();
    setProfileSearchTerm(profileSearchDraft.trim());
  };

  const handleClearProfileSearch = () => {
    setProfileSearchDraft('');
    setProfileSearchTerm('');
  };

  const handleOpenScheduleForm = () => {
    setEditingSchedule(null);
    setIsScheduleFormOpen(true);
  };

  const loadPastSchedules = useCallback(async ({ reset = false } = {}) => {
    if (!isFirebaseConfigured || !currentUser) {
      return;
    }

    setError('');
    setIsPastScheduleLoading(true);

    try {
      const result = await fetchPastSchedulePage({
        cursor: reset ? null : pastScheduleCursor,
      });

      setPastSchedules((currentSchedules) => (
        reset ? result.schedules : [...currentSchedules, ...result.schedules]
      ));
      setPastScheduleCursor(result.cursor);
      setHasMorePastSchedules(result.hasMore);
    } catch (caughtError) {
      setError(`Firestore read error: ${caughtError.message}`);
    } finally {
      setIsPastScheduleLoading(false);
    }
  }, [currentUser, pastScheduleCursor]);

  const handleTogglePastSchedules = () => {
    const nextIsOpen = !isPastSchedulesOpen;

    setIsPastSchedulesOpen(nextIsOpen);

    if (nextIsOpen && pastSchedules.length === 0) {
      loadPastSchedules({ reset: true });
    }
  };

  const handleEditSchedule = (schedule) => {
    if (isScheduleClosed(schedule)) {
      setError('마감된 일정은 수정할 수 없습니다.');
      return;
    }

    setEditingSchedule(schedule);
    setIsScheduleFormOpen(true);
  };

  const handleCloseScheduleForm = () => {
    setEditingSchedule(null);
    setIsScheduleFormOpen(false);
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
      await Promise.all([
        refreshMyProfile(),
        loadProfiles({ reset: true }),
      ]);
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

    if (isScheduleClosed(schedule)) {
      setError('마감된 일정은 삭제할 수 없습니다.');
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

    if (isScheduleClosed(schedule)) {
      setError('마감된 일정은 참여할 수 없습니다.');
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

    if (isScheduleClosed(schedule)) {
      setError('마감된 일정은 참여 취소할 수 없습니다.');
      return;
    }

    try {
      await leaveSchedule(schedule, currentUser);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleAddChatMessage = async (message) => {
    setError('');

    if (!requireLogin()) {
      return false;
    }

    try {
      await createChatMessage(message, currentUser);
      return true;
    } catch (caughtError) {
      setError(caughtError.message);
      return false;
    }
  };

  const handleLoadOlderChatMessages = async () => {
    if (isLoadingOlderChatMessages) {
      return;
    }

    const oldestMessage = olderChatMessages[0] ?? chatMessages[0];

    if (!oldestMessage) {
      return;
    }

    setError('');
    setIsLoadingOlderChatMessages(true);

    try {
      const result = await fetchOlderChatMessages(oldestMessage);

      setOlderChatMessages((currentMessages) => {
        const existingMessageIds = new Set([
          ...currentMessages.map((message) => message.id),
          ...chatMessages.map((message) => message.id),
        ]);
        const nextMessages = result.messages.filter((message) => !existingMessageIds.has(message.id));
        return [...nextMessages, ...currentMessages];
      });
      setHasMoreChatMessages(result.hasMore);
    } catch (caughtError) {
      setError(`Firestore read error: ${caughtError.message}`);
    } finally {
      setIsLoadingOlderChatMessages(false);
    }
  };

  const handleApproveUser = async (user) => {
    setError('');
    setNotice('');
    setTemporaryPinNotice(null);

    if (!currentUser?.isAdmin) {
      setError('관리자만 가입을 승인할 수 있습니다.');
      return;
    }

    try {
      await approveUser(user.id);
      setNotice(`${user.nickname || '사용자'}님의 가입을 승인했습니다.`);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleDeleteUser = async (user) => {
    setError('');
    setNotice('');
    setTemporaryPinNotice(null);

    if (!currentUser?.isAdmin) {
      setError('관리자만 회원을 삭제할 수 있습니다.');
      return;
    }

    if (user.id === currentUser.id) {
      setError('현재 로그인한 관리자 계정은 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm(`${user.nickname || '사용자'}님을 삭제할까요? 계정과 이 사용자가 만든 프로필, 일정, 댓글이 함께 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteUserAccount(user);
      setNotice(`${user.nickname || '사용자'}님을 삭제했습니다.`);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  const handleRequestPasswordReset = async (user) => {
    setError('');
    setNotice('');
    setTemporaryPinNotice(null);

    if (!currentUser?.isAdmin) {
      setError('관리자만 임시 PIN을 발급할 수 있습니다.');
      return;
    }

    try {
      const temporaryPin = await issueTemporaryPin(user.id);
      setTemporaryPinNotice({ nickname: user.nickname || '사용자', pin: temporaryPin });
      setNotice(`${user.nickname || '사용자'}님의 임시 PIN을 발급했습니다.`);
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
          onChangeNickname={handleChangeNickname}
          onChangePin={handleChangePin}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onSignUp={handleSignUp}
        />
      </section>

      {!currentUser && <p className="notice-message">로그인 후 프로필 설정과 일정 등록이 가능합니다.</p>}
      {currentUser?.status === 'pending' && (
        <p className="notice-message">가입 신청이 접수되었습니다. 관리자 승인 후 프로필과 일정 기능을 사용할 수 있습니다.</p>
      )}
      {notice && <p className="success-message">{notice}</p>}
      {temporaryPinNotice && (
        <p className="success-message">
          {temporaryPinNotice.nickname} 임시 PIN: <strong>{temporaryPinNotice.pin}</strong>
        </p>
      )}
      {error && <p className="error-message">{error}</p>}

      <div className={`section-tabs ${currentUser?.isAdmin ? 'section-tabs-admin' : ''}`} aria-label="콘텐츠 탭">
        <button
          aria-pressed={activeSection === 'schedules'}
          className={activeSection === 'schedules' ? 'active-tab' : ''}
          type="button"
          onClick={() => setActiveSection('schedules')}
        >
          <span>일정</span>
          {newContentBySection.schedules && <span className="tab-new-badge">NEW</span>}
        </button>
        <button
          aria-pressed={activeSection === 'profiles'}
          className={activeSection === 'profiles' ? 'active-tab' : ''}
          type="button"
          onClick={() => setActiveSection('profiles')}
        >
          <span>티어표</span>
          {newContentBySection.profiles && <span className="tab-new-badge">NEW</span>}
        </button>
        <button
          aria-pressed={activeSection === 'chat'}
          className={activeSection === 'chat' ? 'active-tab' : ''}
          type="button"
          onClick={() => setActiveSection('chat')}
        >
          <span>채팅</span>
          {newContentBySection.chat && <span className="tab-new-badge">NEW</span>}
        </button>
        {currentUser?.isAdmin && (
          <button
            aria-pressed={activeSection === 'admin'}
            className={activeSection === 'admin' ? 'active-tab' : ''}
            type="button"
            onClick={() => setActiveSection('admin')}
          >
            회원관리
          </button>
        )}
      </div>

      {currentUser?.isAdmin && (
        <section className={`tab-panel admin-tab-panel ${activeSection === 'admin' ? 'active-panel' : ''}`}>
          <AdminUserPanel
            currentUser={currentUser}
            users={users}
            onApprove={handleApproveUser}
            onDelete={handleDeleteUser}
            onRequestPasswordReset={handleRequestPasswordReset}
          />
        </section>
      )}

      <section className={`tab-panel ${activeSection === 'chat' ? 'active-panel' : ''}`}>
        <div className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Live Chat</p>
              <h2>채팅</h2>
            </div>
          </div>
          {currentUser ? (
            <ChatPanel
              currentUser={isApprovedUser ? currentUser : null}
              hasMoreMessages={hasMoreChatMessages}
              isLoadingOlderMessages={isLoadingOlderChatMessages}
              messages={[...olderChatMessages, ...chatMessages]}
              onAddMessage={handleAddChatMessage}
              onLoadOlderMessages={handleLoadOlderChatMessages}
            />
          ) : (
            <p className="empty-state">로그인 후 채팅을 볼 수 있습니다.</p>
          )}
        </div>
      </section>

      <section className={`workspace tab-panel ${isProfileFormOpen ? '' : 'workspace-list-only'} ${activeSection === 'profiles' ? 'active-panel' : ''}`}>
        <div className="panel list-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Find Friends</p>
              <h2>프로필 목록</h2>
            </div>
            {isApprovedUser && !isProfileFormOpen && (
              <button className="primary-button" onClick={handleOpenProfileForm} type="button">
                {myProfile ? '내 프로필 수정' : '프로필 등록'}
              </button>
            )}
          </div>
          {currentUser ? (
            <>
              <div className="filters">
                <form className="profile-search-form" onSubmit={handleProfileSearchSubmit}>
                  <input
                    aria-label="프로필 닉네임 검색"
                    placeholder="닉네임 검색"
                    value={profileSearchDraft}
                    onChange={(event) => setProfileSearchDraft(event.target.value)}
                  />
                  <button className="primary-button" type="submit">
                    검색
                  </button>
                  {profileSearchTerm && (
                    <button className="ghost-button" type="button" onClick={handleClearProfileSearch}>
                      초기화
                    </button>
                  )}
                </form>
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
                currentUser={isApprovedUser ? currentUser : null}
                isLoading={isProfileListLoading}
                profiles={profiles}
                onDelete={handleDeleteProfile}
                onEdit={handleEditProfile}
              />
              {currentUser && hasMoreProfiles && (
                <div className="load-more-row">
                  <button type="button" onClick={() => loadProfiles()} disabled={isProfileListLoading}>
                    {isProfileListLoading ? '불러오는 중...' : '더 보기'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="empty-state">로그인 후 프로필 목록을 볼 수 있습니다.</p>
          )}
        </div>

        {isProfileFormOpen && (
          <div className="panel form-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Profiles</p>
                <h2>{editingProfile ? '프로필 수정' : '프로필 등록'}</h2>
              </div>
              <button className="ghost-button" onClick={handleCloseProfileForm} type="button">
                닫기
              </button>
            </div>
            {isApprovedUser ? (
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
        )}
      </section>

      <section className={`workspace tab-panel ${isScheduleFormOpen ? '' : 'workspace-list-only'} ${activeSection === 'schedules' ? 'active-panel' : ''}`}>
        <div className="panel list-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Party Queue</p>
              <h2>일정 목록</h2>
            </div>
            {isApprovedUser && !isScheduleFormOpen && (
              <button className="primary-button" onClick={handleOpenScheduleForm} type="button">
                일정 등록
              </button>
            )}
          </div>
          {currentUser ? (
            <>
              <ScheduleList
                currentUser={isApprovedUser ? currentUser : null}
                schedules={schedules}
                onDelete={handleDeleteSchedule}
                onEdit={handleEditSchedule}
                onJoin={handleJoinSchedule}
                onLeave={handleLeaveSchedule}
              />
              <div className="past-schedule-controls">
                <button type="button" onClick={handleTogglePastSchedules} disabled={isPastScheduleLoading}>
                  {isPastSchedulesOpen ? '이전 일정 닫기' : '이전 일정 보기'}
                </button>
              </div>
              {isPastSchedulesOpen && (
                <div className="past-schedule-section">
                  <h3>이전 일정</h3>
                  <ScheduleList
                    currentUser={isApprovedUser ? currentUser : null}
                    schedules={pastSchedules}
                    onDelete={handleDeleteSchedule}
                    onEdit={handleEditSchedule}
                    onJoin={handleJoinSchedule}
                    onLeave={handleLeaveSchedule}
                  />
                  {hasMorePastSchedules && (
                    <div className="load-more-row">
                      <button type="button" onClick={() => loadPastSchedules()} disabled={isPastScheduleLoading}>
                        {isPastScheduleLoading ? '불러오는 중...' : '이전 일정 더 보기'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="empty-state">로그인 후 일정 목록을 볼 수 있습니다.</p>
          )}
        </div>

        {isScheduleFormOpen && (
          <div className="panel form-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Schedules</p>
                <h2>{editingSchedule ? '일정 수정' : '일정 등록'}</h2>
              </div>
              <button className="ghost-button" onClick={handleCloseScheduleForm} type="button">
                닫기
              </button>
            </div>
            {isApprovedUser ? (
              <ScheduleForm
                key={editingSchedule?.id ?? 'new-schedule'}
                initialSchedule={editingSchedule}
                onSubmit={handleSubmitSchedule}
              />
            ) : (
              <p className="empty-state">로그인 후 게임 일정을 등록할 수 있습니다.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
