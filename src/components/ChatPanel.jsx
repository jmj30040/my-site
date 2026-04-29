import { useEffect, useLayoutEffect, useRef, useState } from 'react';

function formatMessageTime(createdAt) {
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

export function ChatPanel({
  currentUser,
  hasMoreMessages = false,
  isActive = true,
  isLoadingOlderMessages = false,
  messages,
  onAddMessage,
  onLoadOlderMessages,
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const previousLastMessageIdRef = useRef('');
  const hasScrolledToInitialLatestMessageRef = useRef(false);
  const shouldScrollToLatestOnActiveRef = useRef(true);
  const wasActiveRef = useRef(isActive);
  const shouldStickToBottomRef = useRef(true);
  const currentUserId = currentUser?.id ?? '';

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!messageListRef.current) {
          return;
        }

        messageListRef.current.scrollTop = messageListRef.current.scrollHeight - messageListRef.current.clientHeight;
      });
    });
  };

  useLayoutEffect(() => {
    if (isActive && !wasActiveRef.current) {
      shouldScrollToLatestOnActiveRef.current = true;
      shouldStickToBottomRef.current = true;
    }

    wasActiveRef.current = isActive;
  }, [isActive]);

  useLayoutEffect(() => {
    if (
      !isActive ||
      messages.length === 0 ||
      (hasScrolledToInitialLatestMessageRef.current && !shouldScrollToLatestOnActiveRef.current)
    ) {
      return;
    }

    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
    hasScrolledToInitialLatestMessageRef.current = true;
    shouldScrollToLatestOnActiveRef.current = false;
  }, [isActive, messages.length]);

  useEffect(() => {
    if (messages.length === 0) {
      hasScrolledToInitialLatestMessageRef.current = false;
      previousLastMessageIdRef.current = '';
      shouldScrollToLatestOnActiveRef.current = true;
      shouldStickToBottomRef.current = true;
    }
  }, [messages.length]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageId = lastMessage?.id ?? '';
    const isNewLastMessage = lastMessageId && lastMessageId !== previousLastMessageIdRef.current;

    if (!isNewLastMessage) {
      return;
    }

    if (!previousLastMessageIdRef.current || lastMessage.ownerId === currentUserId || shouldStickToBottomRef.current) {
      scrollToBottom();
    }

    previousLastMessageIdRef.current = lastMessageId;
  }, [currentUserId, messages]);

  const handleMessageListScroll = () => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    const distanceFromBottom = messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;

    if (messageList.scrollTop <= 24 && hasMoreMessages && !isLoadingOlderMessages) {
      const previousScrollHeight = messageList.scrollHeight;

      Promise.resolve(onLoadOlderMessages()).finally(() => {
        window.requestAnimationFrame(() => {
          if (!messageListRef.current) {
            return;
          }

          messageListRef.current.scrollTop = messageListRef.current.scrollHeight - previousScrollHeight;
        });
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    shouldStickToBottomRef.current = true;
    const isSaved = await onAddMessage(draft);

    if (isSaved) {
      setDraft('');
      scrollToBottom();
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  if (!currentUser) {
    return <p className="empty-state">로그인 후 채팅에 참여할 수 있습니다.</p>;
  }

  return (
    <div className="chat-room">
      <div className="chat-room-heading">
        <div>
          <h3>전체 채팅</h3>
          <p>로그인한 친구들과 바로 대화할 수 있습니다.</p>
        </div>
        <span className="count-badge">최근 {messages.length}개</span>
      </div>

      {messages.length > 0 ? (
        <div className="comment-list chat-message-list" ref={messageListRef} onScroll={handleMessageListScroll}>
          {hasMoreMessages && (
            <button className="load-older-chat-button" type="button" onClick={onLoadOlderMessages} disabled={isLoadingOlderMessages}>
              {isLoadingOlderMessages ? '불러오는 중...' : '이전 채팅 보기'}
            </button>
          )}
          {messages.map((message) => {
            const messageTime = formatMessageTime(message.createdAt);

            const isMine = currentUserId === message.ownerId;

            return (
              <div
                className={`chat-message ${isMine ? 'my-chat-message' : 'other-chat-message'}`}
                key={message.id}
              >
                <p className="chat-message-meta">
                  {!isMine && <strong>{message.ownerNickname || '알 수 없음'}</strong>}
                  {messageTime && <span>{messageTime}</span>}
                </p>
                <p className="chat-bubble">{message.message}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="comment-empty">아직 채팅이 없습니다.</p>
      )}

      <form className="comment-form chat-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          maxLength={160}
          placeholder="메시지 입력"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="primary-button"
          type="submit"
          disabled={!draft.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
        >
          보내기
        </button>
      </form>
    </div>
  );
}
