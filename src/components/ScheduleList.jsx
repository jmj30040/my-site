import { useEffect, useState } from 'react';
import { isScheduleClosed } from '../utils/scheduleStatus';

function canManageItem(currentUser, item) {
  return Boolean(currentUser?.isAdmin || currentUser?.id === item.ownerId);
}

export function ScheduleList({
  currentUser,
  participantProfiles = {},
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
        const participantItems = participants.map((participant, index) => {
          const participantId = participantIds[index] ?? '';
          const profile = participantProfiles[participantId];

          return {
            id: participantId || `${schedule.id}-${participant}`,
            imageUrl: profile?.profileImageUrl ?? '',
            name: participant,
          };
        });
        const canManage = canManageItem(currentUser, schedule);
        const isClosed = isScheduleClosed(schedule, now);
        const canEditClosedSchedule = Boolean(currentUser?.isAdmin);
        const capacity = Number(schedule.capacity);
        const hasCapacityLimit = Number.isFinite(capacity) && capacity > 0;
        const isFull = hasCapacityLimit && participants.length >= capacity;
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
                {isFull && <span className="closed-badge">모집 완료</span>}
                <span className="count-badge">
                  {hasCapacityLimit ? `${participants.length}/${capacity}명` : `${participants.length}명`}
                </span>
              </div>
            </div>
            <p className="bio">{schedule.memo || '메모가 없습니다.'}</p>
            <p className="meta">작성자: {schedule.ownerNickname || '알 수 없음'}</p>
            <div className="schedule-participants">
              <span className="meta">참여자:</span>
              {participantItems.length > 0 ? (
                <div className="schedule-participant-list">
                  {participantItems.map((participant) => (
                    <span className="schedule-participant" key={participant.id}>
                      {participant.imageUrl ? (
                        <img
                          className="schedule-participant-avatar"
                          src={participant.imageUrl}
                          alt={`${participant.name} 프로필 이미지`}
                        />
                      ) : (
                        <span className="schedule-participant-avatar schedule-participant-avatar-placeholder">
                          {participant.name?.slice(0, 1) ?? '?'}
                        </span>
                      )}
                      <span>{participant.name}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="meta">아직 없음</span>
              )}
            </div>
            <div className="actions">
              {currentUser &&
                (isJoined ? (
                  <button disabled={isClosed} onClick={() => onLeave(schedule)}>
                    참여 취소
                  </button>
                ) : (
                  <button className="primary-button" disabled={isClosed || isFull} onClick={() => onJoin(schedule)}>
                    {isFull ? '모집 완료' : '참여하기'}
                  </button>
                ))}
              {canManage && (
                <>
                  <button disabled={isClosed && !canEditClosedSchedule} onClick={() => onEdit(schedule)}>
                    수정
                  </button>
                  <button className="danger-button" disabled={isClosed && !canEditClosedSchedule} onClick={() => onDelete(schedule)}>
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
