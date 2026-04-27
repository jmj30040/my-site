import { useEffect } from 'react';

export function ImageLightbox({ alt, imageUrl, onClose }) {
  useEffect(() => {
    if (!imageUrl) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="프로필 이미지 확대 보기">
      <button className="lightbox-backdrop" type="button" aria-label="확대 이미지 닫기" onClick={onClose} />
      <div className="lightbox-content">
        <button className="lightbox-close-button" type="button" aria-label="확대 이미지 닫기" onClick={onClose}>
          X
        </button>
        <img src={imageUrl} alt={alt} />
      </div>
    </div>
  );
}
