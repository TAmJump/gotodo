
(function(){
  var START=new Date(2026,9,1), END=new Date(2027,9,31), DAY=86400000, PX=3;
  var HOLI={"2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日", "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日", "2027-02-23": "天皇誕生日", "2027-03-21": "春分の日", "2027-03-22": "振替休日", "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日", "2027-05-05": "こどもの日", "2027-07-19": "海の日", "2027-08-11": "山の日", "2027-09-20": "敬老の日", "2027-09-23": "秋分の日", "2027-10-11": "スポーツの日", "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日"};
  function offDay(k){var d=pd(k);return !!HOLI[k]||d.getDay()===0||d.getDay()===6;}
  function prevWork(k){var d=pd(k);while(offDay(ymd(d)))d=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1);return ymd(d);}
  var GCOL={oasis:'#0f766e',sakae:'#2F4C8F',goto:'#7B4FA0',gotokitei:'#A07CC0',npo:'#D9772B',kumiai:'#3A8A62',gms:'#C8467A',gmskitei:'#E08AAE',site:'#B08A1E'};
  var PAL=['#0f766e','#2F4C8F','#7B4FA0','#D9772B','#3A8A62','#C8467A','#B08A1E','#4A7FA8'];
  function gc(id){if(GCOL[id])return GCOL[id];var o=(groups[id]&&groups[id].o)||0;return PAL[o%PAL.length];}
  function ownerTag(t){return t.owner?'<span class="owner">'+esc(t.owner)+'</span>':'';}
  var STATUS={none:'未着手',prep:'準備中',revenue:'売上あり',profit:'黒字化'};
  var groups={}, tasks={}, notes={}, canWrite=false, TOKEN='';
  var API=String(window.GOTODO_API||'').replace(/\/$/,''), ME='';
  lss('gotodo-pass',''); lss('gotodo-name','');
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
  function view(){var h=(location.hash||'').slice(1);return ['list','gantt','calendar','profit','log'].indexOf(h)>=0?h:'list';}
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
    ({list:rList,gantt:rGantt,calendar:rCal,profit:rProfit,log:rLog})[view()]();
  }
  function taskLi(t){
    var st=state(t);
    return '<li class="task '+(t.done?'done':'')+'"><input type="checkbox" data-tg="'+esc(t.id)+'"'+(t.done?' checked':'')+(canWrite?'':' disabled')+' aria-label="完了：'+esc(t.t)+'">'
      +'<div class="t" data-edit="'+esc(t.id)+'"><b>'+esc(t.t)+'</b>'+(t.owner?'<span class="owner">'+esc(t.owner)+'</span>':'')+((notes[t.id]||[]).length?'<span class="ncount">記録 '+notes[t.id].length+'</span>':'')+(t.n?'<span class="n">'+esc(t.n)+'</span>':'')+'</div>'
      +'<div class="dates">'+(t.s?'<span class="range">'+short(t.s)+'→</span>':'')+'<span class="due '+st+'">'+esc(t.d?t.d.slice(2).replace(/-/g,'/'):'期限なし')+'</span></div></li>';
  }
  function rList(){
    var fg=document.getElementById('fgroup').value, html='';
    sortedGroups().forEach(function(g){
      if(fg&&g.id!==fg)return;
      var ts=filtered(g.id), allg=Object.keys(tasks).filter(function(k){return tasks[k].g===g.id;}), dg=allg.filter(function(k){return tasks[k].done;}).length;
      html+='<section class="g" style="border-top:4px solid '+gc(g.id)+'"><div class="gh"><h2>'+esc(g.name)+'</h2>'+(g.tag?'<span class="tag">'+esc(g.tag)+'</span>':'')+(g.goal?'<span class="goal">利益化目標 '+esc(g.goal.replace('-','/'))+'</span>':'')+'<span class="gc">'+dg+' / '+allg.length+'</span>'
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
      rows+='<div class="grow gsec"><div class="glabel" title="'+esc(g.name)+'" style="box-shadow:inset 5px 0 0 '+gc(g.id)+'">'+(canWrite?'<button type="button" class="gadd" data-add="'+esc(g.id)+'" aria-label="'+esc(g.name)+'にタスクを追加" title="この事業にタスクを追加">＋</button>':'')+esc(g.name)+'</div><div class="gtrack">'+months
        +(s&&e?'<div class="gspan" style="background:'+gc(g.id)+';border-color:'+gc(g.id)+';opacity:.35;left:'+x(s)+'px;width:'+Math.max(6,x(e)-x(s)+PX)+'px"></div>':'')
        +(gl?'<div class="diamond" style="left:'+x(gl)+'px" title="利益化目標 '+esc(g.goal)+'"></div>':'')+'</div></div>';
      ts.forEach(function(t){
        var a=pd(t.s)||pd(t.d), b=pd(t.d); if(!b)return; if(a>b)a=b;
        rows+='<div class="grow '+(t.done?'done':'')+'"><div class="glabel" data-edit="'+esc(t.id)+'" title="'+esc(t.t)+(t.owner?'（担当：'+esc(t.owner)+'）':'')+'" style="box-shadow:inset 5px 0 0 '+gc(t.g)+'">'+ownerTag(t)+esc(t.t)+'</div><div class="gtrack">'+months
          +'<div class="gbar '+state(t)+'" data-edit="'+esc(t.id)+'" style="--gc:'+gc(t.g)+';left:'+x(a)+'px;width:'+Math.max(6,x(b)-x(a)+PX)+'px" title="'+esc(t.t)+'（'+short(t.s)+'〜'+short(t.d)+(t.owner?'／担当：'+esc(t.owner):'')+'）"></div></div></div>';
      });
    });
    var tl=today>=START&&today<=END?'<div class="today" style="left:'+(lw+x(today))+'px"><span>今日</span></div>':'';
    app.innerHTML='<div class="gwrap"><div class="gantt" style="--lw:'+lw+'px;--tw:'+tw+'px">'+rows+tl+'</div></div>'
      +'<div class="legend"><span>バーの色は事業ごと</span><span><i style="background:var(--surface);border:2px solid var(--warn)"></i>期限7日以内</span><span><i style="background:var(--surface);border:2px solid var(--late)"></i>期限切れ</span><span><i style="background:var(--line)"></i>完了</span><span><i style="background:var(--gold);transform:rotate(45deg);width:10px"></i>利益化目標</span></div>';
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
      cells+='<div class="cell'+(d.getMonth()!==calMonth.getMonth()?' out':'')+(offDay(k)?' off':'')+(+d===+today?' is-today':'')+'"><div class="dn">'+d.getDate()+(HOLI[k]?' <span class="hn">'+HOLI[k]+'</span>':'')+'</div>'
        +dt.map(function(t){return '<button type="button" class="chip '+state(t)+'" data-edit="'+esc(t.id)+'" title="'+esc(t.t)+(t.owner?'（担当：'+esc(t.owner)+'）':'')+'" style="box-shadow:inset 3px 0 0 '+gc(t.g)+'">'+(t.owner?'['+esc(t.owner)+'] ':'')+esc(t.t)+'</button>';}).join('')
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
    document.getElementById('extra').hidden=!id;
    if(id){renderNotes();loadHist();}
    document.getElementById('modal').hidden=false; document.getElementById('f_t').focus();
  }
  function fmtAt(a){return a?new Date(a).toLocaleString('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';}
  var noteEdit=null, noteDel=null;
  function renderNotes(){
    var list=(notes[editing]||[]), box=document.getElementById('noteList');
    box.innerHTML=list.length?list.map(function(n){
      var mine=n.author===ME, editingThis=noteEdit===n.id;
      return '<li class="note"><div class="nh"><b>'+esc(n.author)+'</b><span>'+fmtAt(n.at)+(n.updated_at?'（編集 '+fmtAt(n.updated_at)+'）':'')+'</span>'
        +(mine&&!editingThis?'<span class="nact"><button type="button" data-nedit="'+esc(n.id)+'">編集</button><button type="button" data-ndel="'+esc(n.id)+'">'+(noteDel===n.id?'もう一度押すと削除':'削除')+'</button></span>':'')+'</div>'
        +(editingThis?'<textarea id="nEditBody">'+esc(n.body)+'</textarea><div class="nact2"><button type="button" class="btn ghost" data-ncancel="1">取り消す</button><button type="button" class="btn" data-nsave="'+esc(n.id)+'">保存</button></div>':'<div class="nb">'+esc(n.body)+'</div>')+'</li>';
    }).join(''):'<li class="note empty-note">まだ記録はありません。</li>';
  }
  async function loadHist(){
    var box=document.getElementById('histList'); box.innerHTML='<li class="hist">読み込み中…</li>';
    try{var d=await api('GET','/api/logs?task='+encodeURIComponent(editing));
      box.innerHTML=d.logs.length?d.logs.map(function(l){return '<li class="hist"><span class="hat">'+fmtAt(l.at)+'</span><b>'+esc(l.actor)+'</b><span>'+esc(l.detail)+'</span></li>';}).join(''):'<li class="hist">まだ履歴はありません。</li>';
    }catch(e){box.innerHTML='<li class="hist">履歴を読み込めませんでした。</li>';}
  }
  document.getElementById('noteList').addEventListener('click',async function(e){
    var b=e.target.closest('button'); if(!b)return;
    if(b.dataset.nedit){noteEdit=b.dataset.nedit;noteDel=null;renderNotes();return;}
    if(b.dataset.ncancel){noteEdit=null;renderNotes();return;}
    if(b.dataset.ndel){if(noteDel!==b.dataset.ndel){noteDel=b.dataset.ndel;renderNotes();return;}
      try{await api('DELETE','/api/notes/'+b.dataset.ndel);noteDel=null;await load();renderNotes();loadHist();setStatus('記録を削除しました');}catch(err){fail(err);}return;}
    if(b.dataset.nsave){var v=document.getElementById('nEditBody').value.trim();if(!v)return;
      try{await api('PUT','/api/notes/'+b.dataset.nsave,{body:v});noteEdit=null;await load();renderNotes();loadHist();setStatus('記録を保存しました');}catch(err){fail(err);}}
  });
  document.getElementById('noteAdd').addEventListener('click',async function(){
    var ta=document.getElementById('noteNew'), v=ta.value.trim(); if(!v||!editing)return;
    try{await api('POST','/api/notes',{task_id:editing,body:v});ta.value='';await load();renderNotes();loadHist();setStatus('記録を追加しました');}catch(err){fail(err);}
  });
  async function rLog(){
    app.innerHTML='<div class="agenda"><h3>変更履歴（直近300件）</h3><ul id="allLog"><li class="hist">読み込み中…</li></ul></div>';
    try{var d=await api('GET','/api/logs');var el=document.getElementById('allLog');if(!el)return;
      el.innerHTML=d.logs.length?d.logs.map(function(l){var t=tasks[l.task_id];return '<li class="hist"><span class="hat">'+fmtAt(l.at)+'</span><b>'+esc(l.actor)+'</b><span>'+(t?'<a href="#" data-edit="'+esc(l.task_id)+'">'+esc(t.t)+'</a>：':'')+esc(l.detail)+'</span></li>';}).join(''):'<li class="hist">まだ履歴はありません。</li>';
    }catch(e){}
  }
  function closeEdit(){document.getElementById('modal').hidden=true;editing=null;noteEdit=null;noteDel=null;document.getElementById('noteNew').value='';}
  async function stamp(o){return o;}
  function api(m,p,b){return fetch(API+p,{method:m,headers:{'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},body:b?JSON.stringify(b):undefined}).then(function(r){if(r.status===401){if(TOKEN){TOKEN='';closeEdit();showLogin('時間がたったため、もう一度ログインしてください');}throw {code:'unauthorized'};}if(r.status===403){return r.json().then(function(j){if(j.error==='must_change'){showChange();throw {code:'unauthorized'};}throw {code:'forbidden'};});}if(!r.ok)throw {code:'http'};return r.json();});}
  async function load(){var d=await api('GET','/api/data');var g={};d.groups.forEach(function(x){g[x.id]=x;});var t={};d.tasks.forEach(function(x){x.done=!!x.done;t[x.id]=x;});var n={};(d.notes||[]).forEach(function(x){(n[x.task_id]=n[x.task_id]||[]).push(x);});groups=g;tasks=t;notes=n;canWrite=true;if(view()!=='log'||!document.getElementById('allLog'))render();}
  function fail(e){if(e&&e.code==='unauthorized')return;if(e&&e.code==='forbidden'){setStatus('ほかの人の記録は変更できません',true);return;}setStatus('保存できませんでした。通信状況を確認して、もう一度お試しください',true);}
  document.getElementById('form').addEventListener('submit',async function(ev){
    ev.preventDefault(); if(!canWrite)return;
    var o={g:document.getElementById('f_g').value,t:document.getElementById('f_t').value.trim(),n:document.getElementById('f_n').value.trim(),s:document.getElementById('f_s').value,d:document.getElementById('f_d').value,owner:document.getElementById('f_o').value.trim(),done:document.getElementById('f_done').checked};
    if(!o.t||!o.d){setStatus('タスク名と期限を入力してください',true);return;}
    var moved=[];
    if(o.d&&offDay(o.d)){o.d=prevWork(o.d);moved.push('期限を'+short(o.d));}
    if(o.s&&offDay(o.s)){o.s=prevWork(o.s);moved.push('開始日を'+short(o.s));}
    if(o.s&&o.s>o.d){setStatus('開始日は期限より前の日付にしてください',true);return;}
    await stamp(o); setStatus('保存中…');
    try{
      if(editing){await api('PUT','/api/tasks/'+editing,o);}
      else{var mx=0;Object.keys(tasks).forEach(function(k){mx=Math.max(mx,tasks[k].o||0);});o.o=mx+1;await api('POST','/api/tasks',o);}
      setStatus(moved.length?'土日祝を避けて'+moved.join('、')+'に変更して保存しました':'保存しました'); closeEdit(); await load();
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
  function showLogin(msg){document.getElementById('chg').hidden=true;document.getElementById('login').hidden=false;document.getElementById('l_err').textContent=msg||'';if(!msg)document.getElementById('l_name').value='';document.getElementById('l_pass').value='';groups={};tasks={};notes={};canWrite=false;app.innerHTML='';ME=TOKEN?ME:'';showMe();}
  function showChange(){document.getElementById('login').hidden=true;document.getElementById('chg').hidden=false;document.getElementById('c_err').textContent='';document.getElementById('c_pass').value='';document.getElementById('c_pass2').value='';document.getElementById('c_pass').focus();}
  function showMe(){document.getElementById('me').innerHTML=ME&&TOKEN?'ログイン中：'+esc(ME)+'<button type="button" id="chpw">パスワード変更</button><button type="button" id="logout">ログアウト</button>':'';}
  document.getElementById('me').addEventListener('click',function(e){
    if(e.target.id==='logout'){var t=TOKEN;api('POST','/api/logout').catch(function(){});TOKEN='';ME='';showLogin();}
    if(e.target.id==='chpw'){showChange();}
  });
  document.getElementById('loginForm').addEventListener('submit',async function(ev){
    ev.preventDefault();
    var name=document.getElementById('l_name').value, pass=document.getElementById('l_pass').value;
    if(!name||!pass)return;
    try{
      var r=await fetch(API+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,pass:pass})});
      if(r.status===401){document.getElementById('l_err').textContent='名前かパスワードが違います';document.getElementById('l_pass').value='';return;}
      if(!r.ok)throw 0;
      var j=await r.json(); TOKEN=j.token; ME=j.name;
      if(j.mustChange){showChange();return;}
      await load();document.getElementById('login').hidden=true;showMe();
    }catch(e){document.getElementById('l_err').textContent='サーバーに接続できませんでした。時間をおいてもう一度お試しください';}
  });
  document.getElementById('chgForm').addEventListener('submit',async function(ev){
    ev.preventDefault();
    var p=document.getElementById('c_pass').value, p2=document.getElementById('c_pass2').value, err=document.getElementById('c_err');
    if(!p.trim()){err.textContent='新しいパスワードを入力してください';return;}
    if(p!==p2){err.textContent='確認用のパスワードが一致しません';return;}
    if(p==='5555'){err.textContent='5555 以外のパスワードにしてください';return;}
    try{await api('POST','/api/password',{pass:p});document.getElementById('chg').hidden=true;await load();showMe();setStatus('パスワードを変更しました');}
    catch(e){err.textContent='変更できませんでした。もう一度お試しください';}
  });
  document.getElementById('chgCancel').addEventListener('click',function(){if(groups&&Object.keys(groups).length){document.getElementById('chg').hidden=true;}else{TOKEN='';ME='';showLogin();}});
  setInterval(function(){if(TOKEN&&document.visibilityState==='visible'&&document.getElementById('modal').hidden&&document.getElementById('login').hidden&&document.getElementById('chg').hidden)load().catch(function(){});},30000);
  document.addEventListener('visibilitychange',function(){if(TOKEN&&document.getElementById('chg').hidden&&document.visibilityState==='visible')load().catch(function(){});});
  if(!API||API.indexOf('REPLACE')>=0){app.innerHTML='<div class="empty">接続先のAPIがまだ設定されていません。</div>';}
  else{showLogin();}
})();
