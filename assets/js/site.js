(function(){
  // 스크롤하면 상단 메뉴에 경계선 표시
  var nav = document.getElementById('site-nav');
  if(nav){
    var onScroll = function(){ nav.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // 글쓰기 토큰이 저장된 브라우저(=나)에서만 글쓰기 버튼 보이기
  try{
    if(localStorage.getItem('writer.token')){
      document.querySelectorAll('[data-owner-only]').forEach(function(el){ el.hidden = false; });
    }
  }catch(e){}

  // 블로그 목록 태그 필터 (?tag=이름 으로 바로 열기 가능)
  var filter = document.querySelector('[data-tag-filter]');
  if(!filter) return;
  var buttons = filter.querySelectorAll('button[data-tag]');
  var items = document.querySelectorAll('.post-card');
  var years = document.querySelectorAll('.post-year');
  var empty = document.querySelector('[data-blog-empty]');

  function apply(tag){
    buttons.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.tag === tag)); });
    var shown = 0;
    items.forEach(function(li){
      var tags = (li.dataset.tags || '').split(' ');
      var show = tag === '' || tags.indexOf(tag) !== -1;
      li.hidden = !show;
      if(show) shown++;
    });
    years.forEach(function(y){ y.hidden = !y.querySelector('.post-card:not([hidden])'); });
    if(empty) empty.hidden = shown !== 0;
    var url = new URL(window.location.href);
    if(tag){ url.searchParams.set('tag', tag); } else { url.searchParams.delete('tag'); }
    history.replaceState(null, '', url);
  }

  buttons.forEach(function(b){ b.addEventListener('click', function(){ apply(b.dataset.tag); }); });
  var initial = new URLSearchParams(window.location.search).get('tag') || '';
  var known = Array.prototype.some.call(buttons, function(b){ return b.dataset.tag === initial; });
  apply(known ? initial : '');
})();
