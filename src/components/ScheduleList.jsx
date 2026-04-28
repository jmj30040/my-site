import { useEffect, useState } from 'react';
import { isScheduleClosed } from '../utils/scheduleStatus';

function canManageItem(currentUser, item) {
  return Boolean(currentUser?.isAdmin || currentUser?.id === item.ownerId);
}

export function ScheduleList({
  currentUser,
  schedules,
  onEdit,
  onDelete,
  onJoin,
  onLeave,
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  if (schedules.length === 0) {
    return <p className="empty-state">공유된 게임 일정이 아직 없습니다.</p>;
  }

  return (
    <div className="card-list">
      {schedules.map((schedule) => {
        const participants = schedule.participants ?? [];
        const participantIds = schedule.participantIds ?? [];
        const canManage = canManageItem(currentUser, schedule);
        const isClosed = isScheduleClosed(schedule, now);
        const isJoined = Boolean(
          currentUser && (participantIds.includes(currentUser.id) || participants.includes(currentUser.nickname)),
        );

        return (
          <article className={`schedule-card ${isClosed ? 'closed-schedule' : ''}`} key={schedule.id}>
            <div className="card-topline">
              <div>
                <h3>{schedule.title}</h3>
                <p>
                  {schedule.date} {schedule.startTime}
                  {schedule.endTime ? ` - ${schedule.endTime}` : ''}
                </p>
              </div>
              <div className="schedule-badges">
                {isClosed && <span className="closed-badge">마감</span>}
                <span className="count-badge">{participants.length}명</span>
              </div>
            </div>
            <p className="bio">{schedule.memo || '메모가 없습니다.'}</p>
            <p className="meta">작성자: {schedule.ownerNickname || '알 수 없음'}</p>
            <p className="meta">참여자: {participants.length > 0 ? participants.join(', ') : '아직 없음'}</p>
            <div className="actions">
              {currentUser &&
                (isJoined ? (
                  <button disabled={isClosed} onClick={() => onLeave(schedule)}>
                    참여 취소
                  </button>
                ) : (
                  <button className="primary-button" disabled={isClosed} onClick={() => onJoin(schedule)}>
                    참여하기
                  </button>
                ))}
              {canManage && (
                <>
                  <button disabled={isClosed} onClick={() => onEdit(schedule)}>
                    수정
                  </button>
                  <button className="danger-button" disabled={isClosed} onClick={() => onDelete(schedule)}>
                    삭제
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
