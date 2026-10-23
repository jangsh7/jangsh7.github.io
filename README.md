# jangsh7.github.io

장서현의 포트폴리오 · 소개 · 블로그 사이트입니다. GitHub Pages가 Jekyll로 자동 빌드해요.

| 주소 | 파일 |
| --- | --- |
| `/` 포트폴리오 | `index.html` |
| `/about/` 소개 | `about/index.html` |
| `/blog/` 글 목록 | `blog/index.html` |
| `/blog/글주소/` 글 | `_posts/*.md` |

## 글 쓰기

### 사이트에서 바로 쓰기 (/write/)

1. 처음 한 번: <https://github.com/settings/personal-access-tokens/new> 에서 **Fine-grained token**을 만듭니다.
   - Repository access: **Only select repositories** → `jangsh7/jangsh7.github.io`
   - Permissions → Repository → **Contents: Read and write**
2. `https://jangsh7.github.io/write/` 에 들어가 토큰을 붙여넣으면, 그 브라우저에서만 블로그에 **✏️ 글 쓰기** 버튼이 보여요.
3. 제목·요약·태그·본문(마크다운)을 쓰고 **게시하기** → `_posts/날짜-주소.md`로 커밋되고 1~2분 뒤 사이트에 올라가요.

토큰은 그 브라우저의 저장공간에만 있어요. 다른 사람이 `/write/` 주소를 알아도 토큰이 없으면 아무것도 저장할 수 없어요.
공용 PC에서는 다 쓰고 **이 브라우저에서 토큰 지우기**를 눌러 주세요. 글 저장소와 브랜치는 `_config.yml`의 `writer`에서 바꿀 수 있어요.

### 파일로 직접 쓰기

1. `_drafts/post-template.md`를 복사해서 `_posts/2026-10-22-my-post.md` 처럼 저장합니다.
   - 파일 이름은 `날짜-영문주소.md` 형식이어야 해요. 영문 주소가 글 URL이 됩니다 (`/blog/my-post/`).
2. 맨 위 `title`, `description`, `tags`(그리고 선택으로 대표 사진 `image`)를 채우고 본문을 마크다운으로 씁니다.
3. 커밋하고 push하면 1~2분 뒤 사이트에 올라가요.

이미지는 `assets/img/posts/` 폴더에 넣고 `![설명](/assets/img/posts/파일.png)` 로 씁니다.

## 메뉴·정보 바꾸기

- 상단 메뉴, 이름, 이메일, 링크: `_config.yml`
- 소개 페이지 내용: `about/index.html`
- 색·글꼴: `assets/css/site.css` 맨 위 `:root`

## 내 컴퓨터에서 미리보기 (선택)

Ruby가 설치되어 있다면:

```bash
bundle install
bundle exec jekyll serve --drafts
# http://localhost:4000
```
