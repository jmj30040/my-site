import { useEffect, useRef, useState } from 'react';
import { ROLES, TIERS } from '../constants';

const emptyProfile = {
  battleTag: '',
  tier: '골드',
  role: '공격',
  mainHeroes: '',
  bio: '',
  availableTime: '',
  profileImageUrl: '',
  profileImageFile: null,
};

export function ProfileForm({ currentUser, initialProfile, isSubmitting = false, onSubmit }) {
  const normalizedProfile = initialProfile
    ? {
        battleTag: initialProfile.battleTag ?? '',
        tier: initialProfile.tier ?? '골드',
        role: initialProfile.role ?? '공격',
        mainHeroes: Array.isArray(initialProfile.mainHeroes)
          ? initialProfile.mainHeroes.join(', ')
          : initialProfile.mainHeroes ?? '',
        bio: initialProfile.bio ?? '',
        availableTime: initialProfile.availableTime ?? '',
        profileImageUrl: initialProfile.profileImageUrl ?? '',
        profileImageFile: null,
      }
    : emptyProfile;
  const [form, setForm] = useState(normalizedProfile);
  const [previewUrl, setPreviewUrl] = useState(normalizedProfile.profileImageUrl);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(normalizedProfile.profileImageUrl);
  }, [normalizedProfile.profileImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleImageChange = (event) => {
    const imageFile = event.target.files?.[0] ?? null;

    if (imageFile && !imageFile.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    setForm((currentForm) => ({ ...currentForm, profileImageFile: imageFile }));

    if (!imageFile) {
      setPreviewUrl(form.profileImageUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isSaved = await onSubmit({
      ...form,
      mainHeroes: form.mainHeroes
        .split(',')
        .map((hero) => hero.trim())
        .filter(Boolean),
    });

    if (isSaved && !initialProfile) {
      setForm(emptyProfile);
      setPreviewUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label>
        닉네임
        <input value={currentUser?.nickname ?? ''} disabled placeholder="로그인 후 자동 입력" />
      </label>
      <label className="profile-image-field">
        프로필 이미지
        <div className="profile-image-control">
          {previewUrl ? (
            <img className="profile-avatar profile-avatar-large" src={previewUrl} alt="프로필 이미지 미리보기" />
          ) : (
            <span className="profile-avatar profile-avatar-large profile-avatar-placeholder">
              {currentUser?.nickname?.slice(0, 1) ?? '?'}
            </span>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} disabled={isSubmitting} />
        </div>
      </label>
      <label>
        배틀태그
        <input name="battleTag" value={form.battleTag} onChange={handleChange} placeholder="Player#1234" />
      </label>
      <label>
        티어
        <select name="tier" value={form.tier} onChange={handleChange}>
          {TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
      </label>
      <label>
        주 역할
        <select name="role" value={form.role} onChange={handleChange}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <label className="wide">
        자주 하는 영웅
        <input
          name="mainHeroes"
          value={form.mainHeroes}
          onChange={handleChange}
          placeholder="트레이서, 아나, 윈스턴"
        />
      </label>
      <label className="wide">
        한 줄 소개
        <input name="bio" value={form.bio} onChange={handleChange} placeholder="즐겜도 빡겜도 좋아요" />
      </label>
      <label className="wide">
        접속 가능한 시간대
        <input
          name="availableTime"
          value={form.availableTime}
          onChange={handleChange}
          placeholder="평일 21:00 이후, 주말 오후"
        />
      </label>
      <button className="primary-button wide" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '저장 중...' : initialProfile ? '프로필 수정' : '프로필 생성'}
      </button>
    </form>
  );
}
