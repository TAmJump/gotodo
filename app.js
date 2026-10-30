
(function(){
  var START=new Date(2026,9,1), END=new Date(2027,9,31), DAY=86400000, PX=3;
  var STATUS={none:'未着手',prep:'準備中',revenue:'売上あり',profit:'黒字化'};
  var groups={}, tasks={}, canWrite=false;
  var API=String(window.GOTODO_API||'').replace(/\/$/,''), PASS=lsg('gotodo-pass'), ME=lsg('gotodo-name');
  function lsg(k){try{return localStorage.getItem(k)||'';}catch(e){return '';}}
  function lss(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(e){}}
  var app=document.getElementById('app'), statusEl=document.getElementById('status');
  var calMonth=null, editing=null, delArmed=false;
  var today=new Date(); today.setHours(0,0,0,0);
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function pd(s){if(!s)return null;var p=s.split('-');return new Date(+p[0],+p[1]-1,+(p[2]||1));}
  function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function short(s){if(!s)return '';var p=s.split('-');return p[1]+'/'+p[2];}
  function state(t){if(t.done)return 'done';var d=pd(t.d);if(!d)return '';var n=Math.round((d-today)/DAY);return n<0?'late':(n<=7?'soon':'');}
  function setStatus(m,err){statusEl.textContent=m||'';statusEl.className='status'+(err?' err':'');}
  function sortedGroups(){return Object.keys(groups).map(function(k){return Object.assign({id:k},groups[k]);}).sort(function(a,b){return (a.o||0)-(b.o||0);});}
  function filtered(gid){
    var fg=document.getElementById('fgroup').value, q=document.getElementById('fq').value.trim().toLowerCase();
    return Object.keys(tasks).map(function(k){return Object.assign({id:k},tasks[k]);}).filter(function(t){
      if(gid&&t.g!==gid)return false; if(fg&&t.g!==fg)return false;
      if(q&&((t.t||'')+' '+(t.n||'')+' '+(t.owner||'')).toLowerCase().indexOf(q)<0)return false; return true;
    }).sort(function(a,b){return (a.d||'').localeCompare(b.d||'')||(a.o||0)-(b.o||0);});
  }
  function view(){var h=(location.hash||'').slice(1);return ['list','gantt','calendar','profit'].indexOf(h)>=0?h:'list';}
  function render(){
    var all=Object.keys(tasks).length, done=Object.keys(tasks).filter(function(k){return tasks[k].done;}).length;
    document.getElementById('ovbar').style.width=(all?done/all*100:0)+'%';
    document.getElementById('ovcount').textContent=all?('完了 '+done+' / '+all):'タスクはまだありません';
    document.querySelectorAll('nav.tabs a').forEach(function(a){if(a.dataset.view===view())a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    var fg=document.getElementById('fgroup'), cur=fg.value;
    fg.innerHTML='<option value="">すべての事業</option>'+sortedGroups().map(function(g){return '<option value="'+esc(g.id)+'">'+esc(g.name)+'</option>';}).join('');
    fg.value=cur;
    document.getElementById('addTask').disabled=!canWrite||!sortedGroups().length;
    if(!sortedGroups().length){app.innerHTML='<div class="empty">まだ事業とタスクが登録されていません。データが登録されると、ここに一覧が表示されます。</div>';return;}
    ({list:rList,gantt:rGantt,calendar:rCal,profit:rProfit})[view()]();
  }
  function taskLi(t){
    var st=state(t);
    return '<li class="task '+(t.done?'done':'')+'"><input type="checkbox" data-tg="'+esc(t.id)+'"'+(t.done?' checked':'')+(canWrite?'':' disabled')+' aria-label="完了：'+esc(t.t)+'">'
      +'<div class="t" data-edit="'+esc(t.id)+'"><b>'+esc(t.t)+'</b>'+(t.owner?'<span class="owner">'+esc(t.owner)+'</span>':'')+(t.n?'<span class="n">'+esc(t.n)+'</span>':'')+'</div>'
      +'<div class="dates">'+(t.s?'<span class="range">'+short(t.s)+'→</span>':'')+'<span class="due '+st+'">'+esc(t.d?t.d.slice(2).replace(/-/g,'/'):'期限なし')+'</span></div></li>';
  }
  function rList(){
    var fg=document.getElementById('fgroup').value, html='';
    sortedGroups().forEach(function(g){
      if(fg&&g.id!==fg)return;
      var ts=filtered(g.id), allg=Object.keys(tasks).filter(function(k){return tasks[k].g===g.id;}), dg=allg.filter(function(k){return tasks[k].done;}).length;
      html+='<section class="g"><div class="gh"><h2>'+esc(g.name)+'</h2>'+(g.tag?'<span class="tag">'+esc(g.tag)+'</span>':'')+(g.goal?'<span class="goal">利益化目標 '+esc(g.goal.replace('-','/'))+'</span>':'')+'<span class="gc">'+dg+' / '+allg.length+'</span>'
        +(canWrite?'<button class="btn ghost add" type="button" data-add="'+esc(g.id)+'">＋ 追加</button>':'')+(g.note?'<p class="gnote">'+esc(g.note)+'</p>':'')+'</div><ul>'+ts.map(taskLi).join('')+'</ul></section>';
    });
    app.innerHTML=html||'<div class="empty">条件に合うタスクはありません。</div>';
  }
  function x(d){return Math.max(0,Math.round((d-START)/DAY))*PX;}
  function rGantt(){
    var tw=x(END)+PX, lw=window.innerWidth<640?150:280, fg=document.getElementById('fgroup').value;
    var months='', m=new Date(START);
    while(m<=END){var nx=new Date(m.getFullYear(),m.getMonth()+1,1);months+='<div class="mcell" style="left:'+x(m)+'px;width:'+(x(nx)-x(m))+'px"></div>';m=nx;}
    var mh='';m=new Date(START);
    while(m<=END){mh+='<span class="mlabel" style="left:'+x(m)+'px">'+(m.getMonth()===0||+m===+START?String(m.getFullYear()).slice(2)+'/':'')+(m.getMonth()+1)+'月</span>';m=new Date(m.getFullYear(),m.getMonth()+1,1);}
    var rows='<div class="grow ghead"><div class="glabel">事業・タスク</div><div class="gtrack" style="height:30px">'+months+mh+'</div></div>';
    sortedGroups().forEach(function(g){
      if(fg&&g.id!==fg)return;
      var ts=filtered(g.id); if(!ts.length&&!g.goal)return;
      var s=null,e=null; ts.forEach(function(t){var a=pd(t.s)||pd(t.d),b=pd(t.d);if(a&&(!s||a<s))s=a;if(b&&(!e||b>e))e=b;});
      var gl=g.goal?pd(g.goal+'-01'):null; if(gl){gl=new Date(gl.getFullYear(),gl.getMonth()+1,0);}
      rows+='<div class="grow gsec"><div class="glabel" title="'+esc(g.name)+'">'+esc(g.name)+'</div><div class="gtrack">'+months
        +(s&&e?'<div class="gspan" style="left:'+x(s)+'px;width:'+Math.max(6,x(e)-x(s)+PX)+'px"></div>':'')
        +(gl?'<div class="diamond" style="left:'+x(gl)+'px" title="利益化目標 '+esc(g.goal)+'"></div>':'')+'</div></div>';
      ts.forEach(function(t){
        var a=pd(t.s)||pd(t.d), b=pd(t.d); if(!b)return; if(a>b)a=b;
        rows+='<div class="grow '+(t.done?'done':'')+'"><div class="glabel" data-edit="'+esc(t.id)+'" title="'+esc(t.t)+'">'+esc(t.t)+'</div><div class="gtrack">'+months
          +'<div class="gbar '+state(t)+'" data-edit="'+esc(t.id)+'" style="left:'+x(a)+'px;width:'+Math.max(6,x(b)-x(a)+PX)+'px" title="'+esc(t.t)+'（'+short(t.s)+'〜'+short(t.d)+'）"></div></div></div>';
      });
    });
    var tl=today>=START&&today<=END?'<div class="today" style="left:'+(lw+x(today))+'px"><span>今日</span></div>':'';
    app.innerHTML='<div class="gwrap"><div class="gantt" style="--lw:'+lw+'px;--tw:'+tw+'px">'+rows+tl+'</div></div>'
      +'<div class="legend"><span><i style="background:var(--accent)"></i>予定</span><span><i style="background:var(--warn)"></i>期限7日以内</span><span><i style="background:var(--late)"></i>期限切れ</span><span><i style="background:var(--line)"></i>完了</span><span><i style="background:var(--gold);transform:rotate(45deg);width:10px"></i>利益化目標</span></div>';
    var gw=app.querySelector('.gwrap'); if(gw&&!gw.dataset.scrolled){gw.scrollLeft=Math.max(0,x(today)-120);gw.dataset.scrolled='1';}
  }
  function rCal(){
    if(!calMonth){calMonth=new Date(Math.min(Math.max(today,START),END));calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth(),1);}
    var ts=filtered(), strip='', m=new Date(START);
    while(m<=END){
      var key=m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0');
      var mt=ts.filter(function(t){return (t.d||'').slice(0,7)===key;}), md=mt.filter(function(t){return t.done;}).length;
      strip+='<button type="button" class="mbtn" data-month="'+key+'" aria-pressed="'+(+m===+calMonth)+'"><b>'+(m.getMonth()===0||+m===+START?String(m.getFullYear()).slice(2)+'/':'')+(m.getMonth()+1)+'月</b><span>'+md+'/'+mt.length+'件</span></button>';
      m=new Date(m.getFullYear(),m.getMonth()+1,1);
    }
    var first=new Date(calMonth), lead=(first.getDay()+6)%7, d0=new Date(first.getTime()-lead*DAY), cells='';
    ['月','火','水','木','金','土','日'].forEach(function(w){cells+='<div class="wd">'+w+'</div>';});
    var last=new Date(calMonth.getFullYear(),calMonth.getMonth()+1,0), total=Math.ceil((lead+last.getDate())/7)*7;
    for(var i=0;i<total;i++){
      var d=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+i), k=ymd(d), dt=ts.filter(function(t){return t.d===k;});
      cells+='<div class="cell'+(d.getMonth()!==calMonth.getMonth()?' out':'')+(+d===+today?' is-today':'')+'"><div class="dn">'+d.getDate()+'</div>'
        +dt.map(function(t){return '<button type="button" class="chip '+state(t)+'" data-edit="'+esc(t.id)+'" title="'+esc(t.t)+'">'+esc(t.t)+'</button>';}).join('')
        +(dt.length?'<span class="cnt">'+dt.length+'件</span>':'')+'</div>';
    }
    var mk=calMonth.getFullYear()+'-'+String(calMonth.getMonth()+1).padStart(2,'0');
    var ag=ts.filter(function(t){return (t.d||'').slice(0,7)===mk;});
    app.innerHTML='<div class="mstrip">'+strip+'</div><div class="cal">'+cells+'</div>'
      +'<div class="agenda"><h3>'+calMonth.getFullYear()+'年'+(calMonth.getMonth()+1)+'月が期限のタスク（'+ag.length+'件）</h3><ul>'+(ag.length?ag.map(taskLi).join(''):'<li class="task"><span></span><span class="t">この月が期限のタスクはありません。</span></li>')+'</ul></div>';
  }
  function rProfit(){
    var gs=sortedGroups(), cnt={none:0,prep:0,revenue:0,profit:0};
    gs.forEach(function(g){if(g.goal)cnt[g.status||'none']++;});
    var html='<div class="psum">'+Object.keys(STATUS).map(function(k){return '<div><b>'+cnt[k]+'</b>'+STATUS[k]+'</div>';}).join('')+'</div><div class="pgrid">';
    gs.forEach(function(g){
      var allg=Object.keys(tasks).filter(function(k){return tasks[k].g===g.id;}), dg=allg.filter(function(k){return tasks[k].done;}).length, st=g.status||'none', dis=canWrite?'':' disabled';
      html+='<div class="pcard"><h3>'+esc(g.name)+'</h3><span class="pill '+st+'">'+STATUS[st]+'</span>'
        +'<div class="mini" title="タスク進捗"><i style="width:'+(allg.length?dg/allg.length*100:0)+'%"></i></div><span class="gc">タスク '+dg+' / '+allg.length+'</span>'
        +'<label>利益化の目標月<input type="month" min="2026-10" max="2027-12" data-gf="goal" data-gid="'+esc(g.id)+'" value="'+esc(g.goal||'')+'"'+dis+'></label>'
        +'<label>状況<select data-gf="status" data-gid="'+esc(g.id)+'"'+dis+'>'+Object.keys(STATUS).map(function(k){return '<option value="'+k+'"'+(k===st?' selected':'')+'>'+STATUS[k]+'</option>';}).join('')+'</select></label>'
        +'<label>収益源・メモ<textarea data-gf="memo" data-gid="'+esc(g.id)+'"'+dis+'>'+esc(g.memo||'')+'</textarea></label></div>';
    });
    app.innerHTML=html+'</div>';
  }
  function openEdit(id,gid){
    if(!canWrite&&!id)return;
    editing=id||null; delArmed=false;
    var t=id?tasks[id]:{g:gid||document.getElementById('fgroup').value||sortedGroups()[0].id,t:'',n:'',s:ymd(today),d:'',owner:'',done:false};
    document.getElementById('ftitle').textContent=id?'タスクを編集':'タスクを追加';
    document.getElementById('f_g').innerHTML=sortedGroups().map(function(g){return '<option value="'+esc(g.id)+'">'+esc(g.name)+'</option>';}).join('');
    document.getElementById('f_g').value=t.g; document.getElementById('f_t').value=t.t||''; document.getElementById('f_n').value=t.n||'';
    document.getElementById('f_s').value=t.s||''; document.getElementById('f_d').value=t.d||''; document.getElementById('f_o').value=t.owner||''; document.getElementById('f_done').checked=!!t.done;
    var fdel=document.getElementById('fdel'); fdel.hidden=!id||!canWrite; fdel.textContent='削除';
    document.getElementById('fsave').hidden=!canWrite;
    document.querySelectorAll('#form input,#form select,#form textarea').forEach(function(el){el.disabled=!canWrite;});
    var meta=document.getElementById('fmeta'); meta.textContent='';
    if(id&&t.at){meta.textContent='最終更新 '+new Date(t.at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+(t.by?'（'+t.by+'）':'');}
    document.getElementById('modal').hidden=false; document.getElementById('f_t').focus();
  }
  function closeEdit(){document.getElementById('modal').hidden=true;editing=null;}
  async function stamp(o){o.at=new Date().toISOString();o.by=ME;return o;}
  function api(m,p,b){return fetch(API+p,{method:m,headers:{'Authorization':'Bearer '+PASS,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(function(r){if(r.status===401){showLogin('パスコードが違います');throw {code:'unauthorized'};}if(!r.ok)throw {code:'http'};return r.json();});}
  async function load(){var d=await api('GET','/api/data');var g={};d.groups.forEach(function(x){g[x.id]=x;});var t={};d.tasks.forEach(function(x){x.done=!!x.done;t[x.id]=x;});groups=g;tasks=t;canWrite=true;render();}
  function fail(e){if(e&&e.code==='unauthorized')return;setStatus('保存できませんでした。通信状況を確認して、もう一度お試しください',true);}
  document.getElementById('form').addEventListener('submit',async function(ev){
    ev.preventDefault(); if(!canWrite)return;
    var o={g:document.getElementById('f_g').value,t:document.getElementById('f_t').value.trim(),n:document.getElementById('f_n').value.trim(),s:document.getElementById('f_s').value,d:document.getElementById('f_d').value,owner:document.getElementById('f_o').value.trim(),done:document.getElementById('f_done').checked};
    if(!o.t||!o.d){setStatus('タスク名と期限を入力してください',true);return;}
    if(o.s&&o.s>o.d){setStatus('開始日は期限より前の日付にしてください',true);return;}
    await stamp(o); setStatus('保存中…');
    try{
      if(editing){await api('PUT','/api/tasks/'+editing,o);}
      else{var mx=0;Object.keys(tasks).forEach(function(k){mx=Math.max(mx,tasks[k].o||0);});o.o=mx+1;await api('POST','/api/tasks',o);}
      setStatus('保存しました'); closeEdit(); await load();
    }catch(e){fail(e);}
  });
  document.getElementById('fcancel').addEventListener('click',closeEdit);
  document.getElementById('modal').addEventListener('click',function(e){if(e.target.id==='modal')closeEdit();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!document.getElementById('modal').hidden)closeEdit();});
  document.getElementById('fdel').addEventListener('click',async function(){
    if(!editing)return;
    if(!delArmed){delArmed=true;this.textContent='もう一度押すと削除します';return;}
    try{await api('DELETE','/api/tasks/'+editing);setStatus('削除しました');closeEdit();await load();}catch(e){fail(e);}
  });
  app.addEventListener('click',function(e){
    var ed=e.target.closest('[data-edit]'); if(ed){openEdit(ed.getAttribute('data-edit'));return;}
    var ad=e.target.closest('[data-add]'); if(ad){openEdit(null,ad.getAttribute('data-add'));return;}
    var mb=e.target.closest('[data-month]'); if(mb){calMonth=pd(mb.getAttribute('data-month')+'-01');render();}
  });
  app.addEventListener('change',async function(e){
    var id=e.target.getAttribute('data-tg');
    if(id&&canWrite){var o=await stamp({done:e.target.checked});try{tasks[id].done=o.done;await api('PUT','/api/tasks/'+id,o);setStatus('更新しました');await load();}catch(err){fail(err);}return;}
    var gid=e.target.getAttribute('data-gid'), f=e.target.getAttribute('data-gf');
    if(gid&&f&&canWrite){var u={};u[f]=e.target.value;try{await api('PUT','/api/groups/'+gid,u);setStatus('更新しました');await load();}catch(err){fail(err);}}
  });
  document.getElementById('addTask').addEventListener('click',function(){openEdit(null);});
  ['fgroup','fq'].forEach(function(id){document.getElementById(id).addEventListener('input',render);});
  var hide=document.getElementById('hide');
  try{if(localStorage.getItem('todo-hide')==='1'){hide.checked=true;app.classList.add('hideDone');}}catch(e){}
  hide.addEventListener('change',function(){app.classList.toggle('hideDone',hide.checked);try{localStorage.setItem('todo-hide',hide.checked?'1':'0');}catch(e){}});
  window.addEventListener('hashchange',render);
  var rt=null; window.addEventListener('resize',function(){if(view()!=='gantt')return;clearTimeout(rt);rt=setTimeout(render,200);});
  render();
  function showLogin(msg){document.getElementById('login').hidden=false;document.getElementById('l_err').textContent=msg||'';document.getElementById('l_name').value=ME;}
  function showMe(){document.getElementById('me').innerHTML=ME?'表示名：'+esc(ME)+'<button type="button" id="logout">切り替え</button>':'';}
  document.getElementById('me').addEventListener('click',function(e){if(e.target.id==='logout'){PASS='';lss('gotodo-pass','');showLogin();}});
  document.getElementById('loginForm').addEventListener('submit',async function(ev){
    ev.preventDefault();
    PASS=document.getElementById('l_pass').value.trim(); ME=document.getElementById('l_name').value.trim();
    if(!PASS||!ME)return;
    try{await load();lss('gotodo-pass',PASS);lss('gotodo-name',ME);document.getElementById('login').hidden=true;showMe();}
    catch(e){if(!e||e.code!=='unauthorized')document.getElementById('l_err').textContent='サーバーに接続できませんでした。時間をおいてもう一度お試しください';}
  });
  setInterval(function(){if(PASS&&document.visibilityState==='visible'&&document.getElementById('modal').hidden&&document.getElementById('login').hidden)load().catch(function(){});},30000);
  document.addEventListener('visibilitychange',function(){if(PASS&&document.visibilityState==='visible')load().catch(function(){});});
  if(!API||API.indexOf('REPLACE')>=0){app.innerHTML='<div class="empty">接続先のAPIがまだ設定されていません。</div>';}
  else if(!PASS){showLogin();}
  else{showMe();load().catch(function(e){if(!e||e.code!=='unauthorized')app.innerHTML='<div class="empty">サーバーに接続できませんでした。時間をおいて再読み込みしてください。</div>';});}
})();
