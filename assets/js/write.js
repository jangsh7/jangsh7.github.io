// 글쓰기 페이지: GitHub API로 _posts/에 마크다운 파일을 커밋합니다.
// 토큰은 이 브라우저의 localStorage에만 저장돼요.
(function(){
  var cfg = window.WRITER;
  var TOKEN_KEY = 'writer.token';
  var DRAFT_KEY = 'writer.draft';
  var API = 'https://api.github.com/repos/' + cfg.repo;

  var setup = document.querySelector('[data-writer-setup]');
  var form = document.querySelector('[data-writer]');
  var statusEl = document.querySelector('[data-status]');
  var setupStatus = document.querySelector('[data-setup-status]');
  var preview = document.querySelector('[data-preview]');
  var thumbPreview = document.querySelector('[data-thumb-preview]');
  var thumbClear = document.querySelector('[data-thumb-clear]');

  var thumbFile = null;      // 게시할 때 올릴 대표 사진
  var localImages = {};      // 방금 올린 사진 경로 → 미리보기용 data URL

  function store(k, v){ try{ v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); }catch(e){} }
  function load(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  function say(el, msg, kind){
    el.textContent = msg;
    el.className = 'writer-status' + (kind ? ' is-' + kind : '');
  }

  function gh(path, opts){
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': 'Bearer ' + load(TOKEN_KEY),
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
  }

  function b64FromBytes(bytes){
    var bin = '';
    for(var i = 0; i < bytes.length; i += 0x8000){
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64FromText(s){ return b64FromBytes(new TextEncoder().encode(s)); }

  // 한국 시간 기준 날짜
  function kstParts(){
    var d = new Date(Date.now() + 9 * 3600 * 1000).toISOString();
    return { ymd: d.slice(0, 10), hms: d.slice(11, 19), compact: d.slice(0, 19).replace(/[-:T]/g, '') };
  }

  // ---------- 화면 전환 ----------
  function show(){
    var hasToken = !!load(TOKEN_KEY);
    setup.hidden = hasToken;
    form.hidden = !hasToken;
  }

  document.querySelector('[data-token-save]').addEventListener('click', function(){
    var input = document.querySelector('[data-token-input]');
    var token = input.value.trim();
    if(!token){ say(setupStatus, '토큰을 붙여넣어 주세요.', 'error'); return; }
    store(TOKEN_KEY, token);
    say(setupStatus, '확인하는 중…');
    gh('').then(function(r){ return r.ok ? r.json() : Promise.reject(r.status); }).then(function(repo){
      if(repo.permissions && repo.permissions.push === false) throw 'nopush';
      input.value = '';
      say(setupStatus, '');
      show();
    }).catch(function(err){
      store(TOKEN_KEY, null);
      say(setupStatus, err === 'nopush'
        ? '이 토큰에는 쓰기 권한이 없어요. Contents: Read and write 권한을 확인해 주세요.'
        : '토큰을 확인하지 못했어요 (' + err + '). 저장소 선택과 권한을 확인해 주세요.', 'error');
    });
  });

  document.querySelector('[data-logout]').addEventListener('click', function(){
    store(TOKEN_KEY, null);
    show();
  });

  // ---------- 임시 저장 ----------
  var fields = ['title', 'description', 'tags', 'slug', 'body'];
  function saveDraft(){
    var d = {};
    fields.forEach(function(f){ d[f] = form.elements[f].value; });
    store(DRAFT_KEY, JSON.stringify(d));
  }
  try{
    var draft = JSON.parse(load(DRAFT_KEY) || 'null');
    if(draft) fields.forEach(function(f){ if(draft[f]) form.elements[f].value = draft[f]; });
  }catch(e){}
  form.addEventListener('input', saveDraft);

  // ---------- 작성 / 미리보기 ----------
  var tabs = document.querySelectorAll('[data-tab]');
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      var isPreview = t.dataset.tab === 'preview';
      tabs.forEach(function(b){ b.setAttribute('aria-pressed', String(b === t)); });
      form.elements.body.hidden = isPreview;
      preview.hidden = !isPreview;
      if(isPreview){
        var md = form.elements.body.value;
        Object.keys(localImages).forEach(function(p){ md = md.split('(' + p + ')').join('(' + localImages[p] + ')'); });
        preview.innerHTML = window.marked ? marked.parse(md) : '<pre>' + md.replace(/</g, '&lt;') + '</pre>';
      }
    });
  });

  // ---------- 사진 ----------
  // 너무 큰 사진은 가로 1600px로 줄여서 저장소가 무거워지지 않게
  function prepareImage(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function(){
        var dataUrl = reader.result;
        var ext = (file.name.split('.').pop() || 'png').toLowerCase();
        if(/gif|svg/.test(file.type)){ resolve({ dataUrl: dataUrl, ext: ext }); return; }
        var img = new Image();
        img.onload = function(){
          var max = 1600;
          if(img.width <= max){ resolve({ dataUrl: dataUrl, ext: ext }); return; }
          var c = document.createElement('canvas');
          c.width = max; c.height = Math.round(img.height * max / img.width);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve({ dataUrl: c.toDataURL('image/jpeg', 0.86), ext: 'jpg' });
        };
        img.onerror = function(){ resolve({ dataUrl: dataUrl, ext: ext }); };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file){
    return prepareImage(file).then(function(img){
      var t = kstParts();
      var path = 'assets/img/posts/' + t.compact + '-' + Math.random().toString(36).slice(2, 6) + '.' + img.ext;
      return gh('/contents/' + path, {
        method: 'PUT',
        body: { message: 'Add image ' + path, content: img.dataUrl.split(',')[1], branch: cfg.branch }
      }).then(function(r){
        if(!r.ok) throw new Error('사진 업로드 실패 (' + r.status + ')');
        localImages['/' + path] = img.dataUrl;
        return '/' + path;
      });
    });
  }

  document.querySelector('[data-body-image]').addEventListener('change', function(e){
    var file = e.target.files[0];
    e.target.value = '';
    if(!file) return;
    var ta = form.elements.body;
    var pos = ta.selectionStart;
    say(statusEl, '사진 올리는 중…');
    uploadImage(file).then(function(path){
      var snippet = '\n![](' + path + ')\n';
      ta.value = ta.value.slice(0, pos) + snippet + ta.value.slice(pos);
      saveDraft();
      say(statusEl, '사진을 넣었어요. 사이트에는 게시 후 함께 보여요.', 'ok');
    }).catch(function(err){ say(statusEl, err.message, 'error'); });
  });

  document.querySelector('[data-thumb-input]').addEventListener('change', function(e){
    thumbFile = e.target.files[0] || null;
    e.target.value = '';
    if(!thumbFile) return;
    thumbPreview.src = URL.createObjectURL(thumbFile);
    thumbPreview.hidden = false;
    thumbClear.hidden = false;
  });
  thumbClear.addEventListener('click', function(){
    thumbFile = null;
    thumbPreview.hidden = true;
    thumbClear.hidden = true;
  });

  // ---------- 게시 ----------
  function yamlStr(s){ return JSON.stringify(s); }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var title = form.elements.title.value.trim();
    var body = form.elements.body.value.trim();
    if(!title || !body){ say(statusEl, '제목과 본문을 채워 주세요.', 'error'); return; }

    var t = kstParts();
    var slug = form.elements.slug.value.trim().toLowerCase() || ('post-' + t.compact.slice(0, 12));
    if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)){ say(statusEl, '글 주소는 영문 소문자, 숫자, 하이픈(-)만 쓸 수 있어요.', 'error'); return; }
    var tags = form.elements.tags.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var description = form.elements.description.value.trim();
    var path = '_posts/' + t.ymd + '-' + slug + '.md';

    var btn = document.querySelector('[data-publish]');
    btn.disabled = true;
    say(statusEl, '같은 주소의 글이 있는지 확인하는 중…');

    gh('/contents/_posts?ref=' + encodeURIComponent(cfg.branch)).then(function(r){
      if(r.status === 404) return [];
      if(r.status === 401) throw new Error('토큰이 만료됐거나 잘못됐어요. 토큰을 지우고 다시 넣어 주세요.');
      if(!r.ok) throw new Error('저장소를 읽지 못했어요 (' + r.status + ')');
      return r.json();
    }).then(function(list){
      var taken = list.some(function(f){ return f.name.slice(11) === slug + '.md'; });
      if(taken) throw new Error('"' + slug + '" 주소를 쓰는 글이 이미 있어요. 글 주소를 바꿔 주세요.');
      if(!thumbFile) return null;
      say(statusEl, '대표 사진 올리는 중…');
      return uploadImage(thumbFile);
    }).then(function(image){
      var fm = ['---', 'title: ' + yamlStr(title)];
      if(description) fm.push('description: ' + yamlStr(description));
      fm.push('date: ' + t.ymd + ' ' + t.hms + ' +0900');
      fm.push('tags: [' + tags.map(yamlStr).join(', ') + ']');
      if(image) fm.push('image: ' + image);
      fm.push('---', '', body, '');
      say(statusEl, '게시하는 중…');
      return gh('/contents/' + path, {
        method: 'PUT',
        body: { message: 'Add post: ' + title, content: b64FromText(fm.join('\n')), branch: cfg.branch }
      });
    }).then(function(r){
      if(!r.ok) throw new Error('게시하지 못했어요 (' + r.status + ')');
      store(DRAFT_KEY, null);
      form.reset();
      thumbClear.click();
      var url = cfg.blogUrl + slug + '/';
      statusEl.className = 'writer-status is-ok';
      statusEl.innerHTML = '';
      statusEl.append('게시했어요! 1~2분 뒤 ');
      var a = document.createElement('a');
      a.href = url; a.textContent = url;
      statusEl.append(a, ' 에서 볼 수 있어요.');
    }).catch(function(err){
      say(statusEl, err.message || String(err), 'error');
    }).then(function(){ btn.disabled = false; });
  });

  show();
})();
