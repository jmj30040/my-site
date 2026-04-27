import { useState } from 'react';

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

export function ScheduleList({
  commentsBySchedule = {},
  currentUser,
  schedules,
  onAddComment,
  onDeleteComment,
  onEdit,
  onDelete,
  onJoin,
  onLeave,
}) {
  const [commentDrafts, setCommentDrafts] = useState({});

  const handleCommentChange = (scheduleId, value) => {
    setCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [scheduleId]: value,
    }));
  };

  const handleCommentSubmit = async (event, schedule) => {
    event.preventDefault();
    const draft = commentDrafts[schedule.id] ?? '';
    const isSaved = await onAddComment(schedule, draft);

    if (isSaved) {
      handleCommentChange(schedule.id, '');
    }
  };

  if (schedules.length === 0) {
    return <p className="empty-state">공유된 게임 일정이 아직 없습니다.</p>;
  }

  return (
    <div className="card-list">
      {schedules.map((schedule) => {
        const participants = schedule.participants ?? [];
        const participantIds = schedule.participantIds ?? [];
        const canManage = currentUser?.isAdmin || currentUser?.id === schedule.ownerId;
        const isJoined = Boolean(
          currentUser && (participantIds.includes(currentUser.id) || participants.includes(currentUser.nickname)),
        );
        const comments = commentsBySchedule[schedule.id] ?? [];

        return (
          <article className="schedule-card" key={schedule.id}>
            <div className="card-topline">
              <div>
                <h3>{schedule.title}</h3>
                <p>
                  {schedule.date} {schedule.startTime}
                  {schedule.endTime ? ` - ${schedule.endTime}` : ''}
                </p>
              </div>
              <span className="count-badge">{participants.length}명</span>
            </div>
            <p className="bio">{schedule.memo || '메모가 없습니다.'}</p>
            <p className="meta">작성자: {schedule.ownerNickname || '알 수 없음'}</p>
            <p className="meta">참여자: {participants.length > 0 ? participants.join(', ') : '아직 없음'}</p>
            <div className="actions">
              {currentUser &&
                (isJoined ? (
                  <button onClick={() => onLeave(schedule)}>참여 취소</button>
                ) : (
                  <button className="primary-button" onClick={() => onJoin(schedule)}>
                    참여하기
                  </button>
                ))}
              {canManage && (
                <>
                  <button onClick={() => onEdit(schedule)}>수정</button>
                  <button className="danger-button" onClick={() => onDelete(schedule)}>
                    삭제
                  </button>
                </>
              )}
            </div>
            <div className="schedule-comments">
              <div className="comments-heading">
                <strong>대화</strong>
                <span>{comments.length}개</span>
              </div>
              {comments.length > 0 ? (
                <div className="comment-list">
                  {comments.map((comment) => {
                    const canDeleteComment = currentUser?.isAdmin || currentUser?.id === comment.ownerId;
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
                          <button className="comment-delete-button" type="button" onClick={() => onDeleteComment(comment)}>
                            삭제
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="comment-empty">아직 대화가 없습니다.</p>
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
                <p className="comment-empty">로그인 후 대화에 참여할 수 있습니다.</p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
