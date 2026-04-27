import { useState } from 'react';
import { ImageLightbox } from './ImageLightbox';

const tierClassNames = {
  언랭: 'tier-unranked',
  브론즈: 'tier-bronze',
  실버: 'tier-silver',
  골드: 'tier-gold',
  플래티넘: 'tier-platinum',
  다이아몬드: 'tier-diamond',
  마스터: 'tier-master',
  그랜드마스터: 'tier-grandmaster',
  챔피언: 'tier-champion',
};

function getTierClassName(tier) {
  return tierClassNames[tier] ?? '';
}

export function ProfileList({ currentUser, profiles, onEdit, onDelete }) {
  const [expandedImage, setExpandedImage] = useState(null);

  if (profiles.length === 0) {
    return <p className="empty-state">조건에 맞는 친구 프로필이 아직 없습니다.</p>;
  }

  return (
    <>
      <div className="card-list">
        {profiles.map((profile) => {
          const canManage = currentUser?.isAdmin || currentUser?.id === profile.ownerId;
          const imageAlt = `${profile.ownerNickname} 프로필 이미지`;

          return (
            <article className="profile-card" key={profile.id}>
              <div className="card-topline">
                <div className="profile-summary">
                  {profile.profileImageUrl ? (
                    <button
                      className="profile-avatar-button"
                      type="button"
                      aria-label={`${profile.ownerNickname} 프로필 이미지 확대 보기`}
                      onClick={() => setExpandedImage({ alt: imageAlt, imageUrl: profile.profileImageUrl })}
                    >
                      <img className="profile-avatar" src={profile.profileImageUrl} alt={imageAlt} />
                    </button>
                  ) : (
                    <span className="profile-avatar profile-avatar-placeholder">
                      {profile.ownerNickname?.slice(0, 1) ?? '?'}
                    </span>
                  )}
                  <div>
                    <h3>{profile.ownerNickname}</h3>
                    <p>{profile.battleTag || '배틀태그 미입력'}</p>
                  </div>
                </div>
                <div className="badges">
                  <span className={`tier-badge ${getTierClassName(profile.tier)}`}>{profile.tier}</span>
                  <span>{profile.role}</span>
                </div>
              </div>
              <p className="bio">{profile.bio || '소개가 없습니다.'}</p>
              <p className="meta">
                영웅:{' '}
                {Array.isArray(profile.mainHeroes) && profile.mainHeroes.length > 0
                  ? profile.mainHeroes.join(', ')
                  : '미입력'}
              </p>
              <p className="meta">가능 시간: {profile.availableTime || '미입력'}</p>
              {canManage && (
                <div className="actions">
                  <button onClick={() => onEdit(profile)}>수정</button>
                  <button className="danger-button" onClick={() => onDelete(profile)}>
                    삭제
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <ImageLightbox
        alt={expandedImage?.alt ?? ''}
        imageUrl={expandedImage?.imageUrl ?? ''}
        onClose={() => setExpandedImage(null)}
      />
    </>
  );
}
