# Overwatch Friends Community

친구들끼리 오버워치 프로필을 공유하고, 같이 게임할 일정을 만드는 React + Firebase MVP입니다.

## 기술 스택

- Frontend: React, Vite, CSS
- Auth: Firebase Authentication Email/Password
- Database: Firebase Cloud Firestore
- Deploy: GitHub Pages, GitHub Actions

## 로그인 방식

사용자 화면은 닉네임 + 6자리 PIN 로그인입니다.

내부적으로는 앱이 닉네임을 Firebase Auth용 이메일로 변환해서 Firebase Authentication Email/Password를 사용합니다.

예:

```text
사용자 입력: 민진 / 123456
내부 인증: ow-{nicknameHash}@ow-friends.local / 123456
```

사용자는 이메일을 입력하지 않습니다. 하지만 Firebase Auth `uid`가 발급되므로 Firestore Rules에서 본인 데이터만 수정/삭제하도록 강제할 수 있습니다.

PIN은 Firebase Auth 비밀번호 최소 길이와 보안성을 고려해 숫자 6자리만 허용합니다.

## 폴더 구조

```text
my-site/
  index.html
  package.json
  vite.config.js
  .env.example
  src/
    main.jsx
    App.jsx
    firebase.js
    constants.js
    styles.css
    services/
      firestore.js
    components/
      AuthPanel.jsx
      ProfileForm.jsx
      ProfileList.jsx
      ScheduleForm.jsx
      ScheduleList.jsx
  .github/
    workflows/
      deploy.yml
```

## Firestore 컬렉션 구조

`users/{uid}`:

```js
{
  nickname: '민진',
  nicknameKey: 'hex-encoded-normalized-nickname',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`usernames/{nicknameKey}`:

```js
{
  uid: 'Firebase Auth uid',
  nickname: '민진',
  createdAt: serverTimestamp()
}
```

`profiles/{profileId}`:

```js
{
  ownerId: 'Firebase Auth uid',
  ownerNickname: '민진',
  battleTag: 'Player#1234',
  profileImageUrl: 'data:image/jpeg;base64,...',
  tier: '언랭',
  role: '공격',
  mainHeroes: ['트레이서', '아나'],
  bio: '즐겜도 빡겜도 좋아요',
  availableTime: '평일 21:00 이후',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`schedules/{scheduleId}`:

```js
{
  ownerId: 'Firebase Auth uid',
  ownerNickname: '민진',
  title: '경쟁전 하실 분',
  date: '2026-04-27',
  startTime: '21:00',
  endTime: '23:00',
  memo: '마이크 가능',
  participants: ['민진'],
  participantIds: ['Firebase Auth uid'],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

`scheduleComments/{commentId}`:

```js
{
  scheduleId: 'schedule document id',
  ownerId: 'Firebase Auth uid',
  ownerNickname: '민진',
  message: '마이크 가능?',
  createdAt: serverTimestamp()
}
```

## 권한 동작

- 로그인하지 않아도 프로필 목록과 일정 목록은 볼 수 있습니다.
- 로그인해야 프로필 생성/수정/삭제가 가능합니다.
- 로그인해야 일정 생성/수정/삭제가 가능합니다.
- 로그인해야 일정별 대화에 댓글을 남길 수 있습니다.
- 본인이 만든 프로필과 일정만 수정/삭제 버튼이 보입니다.
- 본인이 쓴 일정 댓글만 삭제할 수 있습니다.
- Firestore Rules에서도 `request.auth.uid`로 본인 수정/삭제를 막습니다.
- 일정 참여/참여 취소는 로그인한 사용자만 가능합니다.

## Firebase 설정

1. Firebase Console에서 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. `Authentication` > `Sign-in method`에서 `Email/Password`를 활성화합니다.
4. 웹 앱을 추가한 뒤 Firebase 설정 값을 복사합니다.
5. `.env.example`을 `.env`로 복사하고 값을 채웁니다.

```powershell
Copy-Item .env.example .env
```

예시:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Firestore Rules

Firebase Console > Firestore Database > Rules에 아래 규칙을 게시하세요.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null
        && request.auth.uid == userId;
    }

    match /usernames/{nicknameKey} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid
        && !exists(/databases/$(database)/documents/usernames/$(nicknameKey));
    }

    match /profiles/{profileId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.ownerId == request.auth.uid
        && request.resource.data.ownerId == resource.data.ownerId;
      allow delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
    }

    match /schedules/{scheduleId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null
        && (
          (
            resource.data.ownerId == request.auth.uid
            && request.resource.data.ownerId == resource.data.ownerId
          )
          || request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['participants', 'participantIds', 'updatedAt'])
            && (
              request.auth.uid in request.resource.data.participantIds
              || request.auth.uid in resource.data.participantIds
            )
        );
      allow delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
    }

    match /scheduleComments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.ownerId == request.auth.uid
        && request.resource.data.scheduleId is string
        && request.resource.data.message is string
        && request.resource.data.message.size() > 0
        && request.resource.data.message.size() <= 160;
      allow delete: if request.auth != null
        && resource.data.ownerId == request.auth.uid;
      allow update: if false;
    }
  }
}
```

참고: 일정 참여/참여 취소는 작성자가 아닌 사용자도 `participants`, `participantIds`만 바꿀 수 있게 허용합니다.

## 프로필 이미지

Firebase Storage 없이 사용할 수 있도록 프로필 이미지는 브라우저에서 320px 이하 JPEG로 압축한 뒤 Firestore `profiles` 문서의 `profileImageUrl` 필드에 저장합니다.

Firestore 문서 크기 제한을 넘지 않도록 원본 이미지는 5MB 이하만 선택할 수 있고, 압축 후에도 너무 큰 이미지는 저장되지 않습니다.

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 Vite가 알려주는 주소로 접속합니다. 보통 아래 주소입니다.

```text
http://localhost:5173
```

## 테스트 방법

1. Firebase Authentication에서 Email/Password 로그인을 활성화합니다.
2. 회원가입 탭에서 닉네임과 숫자 6자리 PIN으로 가입합니다.
3. 같은 닉네임으로 다시 가입하면 "이미 사용 중인 닉네임입니다"가 떠야 합니다.
4. 로그아웃 후 같은 닉네임 + PIN으로 로그인합니다.
5. 잘못된 PIN으로 로그인하면 실패해야 합니다.
6. 로그인 상태에서 프로필과 일정을 생성합니다.
7. 다른 계정으로 로그인하면 기존 프로필/일정의 수정/삭제 버튼이 보이지 않아야 합니다.
8. 다른 계정으로 직접 Firestore 수정 요청을 해도 Rules에서 거부되어야 합니다.

## GitHub Pages 배포

이 저장소는 `.github/workflows/deploy.yml`로 `main` 브랜치에 push할 때 `dist`를 빌드해서 GitHub Pages에 배포합니다.

GitHub 저장소에서 아래 설정을 해주세요.

1. `Settings` > `Pages` > `Build and deployment`를 `GitHub Actions`로 선택합니다.
2. `Settings` > `Secrets and variables` > `Actions`에 `.env`와 같은 Firebase 값을 추가합니다.

필요한 secret 이름:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

배포 주소:

```text
https://jmj30040.github.io/my-site/
```
