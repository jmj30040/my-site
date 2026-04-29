import { useEffect, useState } from 'react';
import { isScheduleClosed } from '../utils/scheduleStatus';

function formatCommentTime(createdAt) {
  if (!createdAt?.toDate) {
    return '';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(createdAt.toDate());
}

function canManageItem(currentUser, item) {
  return Boolean(currentUser?.isAdmin || currentUser?.id === item.ownerId);
}

export function ScheduleList({
  commentsBySchedule = {},
  currentUser,
  participantProfiles = {},
  schedules,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onJoin,
  onLeave,
}) {
  const [commentDrafts, setCommentDrafts] = useState({});
  const [now, setNow] = useState(() => new Date());

  const handleCommentChange = (scheduleId, value) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [scheduleId]: value,
    }));
  };

  const handleCommentSubmit = async (event, schedule) => {
    event.preventDefault();

    if (!onAddComment) {
      return;
    }

    const draft = commentDrafts[schedule.id] ?? '';
    const isSaved = await onAddComment(schedule, draft);

    if (isSaved) {
      handleCommentChange(schedule.id, '');
    }
  };

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
        const comments = commentsBySchedule[schedule.id] ?? [];

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
            <div className="schedule-comments">
              <div className="comments-heading">
                <strong>댓글</strong>
                <span>{comments.length}개</span>
              </div>
              {comments.length > 0 ? (
                <div className="comment-list">
                  {comments.map((comment) => {
                    const canDeleteComment = Boolean(currentUser?.isAdmin || currentUser?.id === comment.ownerId);
                    const commentTime = formatCommentTime(comment.createdAt);

                    return (
                      <div className="comment-item" key={comment.id}>
                        <div>
                          <p>
                            <strong>{comment.ownerNickname || '알 수 없음'}</strong>
                            {commentTime && <span>{commentTime}</span>}
                          </p>
                          <p>{comment.message}</p>
                        </div>
                        {canDeleteComment && (
                          <button
                            className="comment-delete-button"
                            type="button"
                            onClick={() => onDeleteComment?.(comment)}
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="comment-empty">아직 댓글이 없습니다.</p>
              )}
              {currentUser ? (
                <form className="comment-form" onSubmit={(event) => handleCommentSubmit(event, schedule)}>
                  <input
                    maxLength={160}
                    placeholder="참여 가능해요, 몇 시부터 가능, 마이크 가능?"
                    value={commentDrafts[schedule.id] ?? ''}
                    onChange={(event) => handleCommentChange(schedule.id, event.target.value)}
                  />
                  <button type="submit" disabled={!commentDrafts[schedule.id]?.trim()}>
                    보내기
                  </button>
                </form>
              ) : (
                <p className="comment-empty">로그인 후 댓글을 남길 수 있습니다.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
