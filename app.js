
(function(){
  var START=new Date(2026,9,1), END=new Date(2027,9,31), DAY=86400000, PX=3;
  var HOLI={"2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日", "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日", "2027-02-23": "天皇誕生日", "2027-03-21": "春分の日", "2027-03-22": "振替休日", "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日", "2027-05-05": "こどもの日", "2027-07-19": "海の日", "2027-08-11": "山の日", "2027-09-20": "敬老の日", "2027-09-23": "秋分の日", "2027-10-11": "スポーツの日", "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日"};
  function offDay(k){var d=pd(k);return !!HOLI[k]||d.getDay()===0||d.getDay()===6;}
  function prevWork(k){var d=pd(k);while(offDay(ymd(d)))d=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1);return ymd(d);}
  var GCOL={oasis:'#00A040',sakae:'#0050FF',goto:'#7A00E6',gotokitei:'#B400FF',npo:'#FF7A00',kumiai:'#00A8A8',gms:'#E6007E',gmskitei:'#FF3399',site:'#FFC800',migrate:'#00B8F0',mimoto:'#E60012'};
  var PAL=['#00A040','#0050FF','#7A00E6','#FF7A00','#00A8A8','#E6007E','#FFC800','#E60012'];
  function gc(id){if(GCOL[id])return GCOL[id];var o=(groups[id]&&groups[id].o)||0;return PAL[o%PAL.length];}
  function ownerTag(t){return t.owner?'<span class="owner">'+esc(t.owner)+'</span>':'';}
  var STATUS={none:'未着手',prep:'準備中',revenue:'売上あり',profit:'黒字化'};
  var groups={}, tasks={}, notes={}, budgets=[], actuals={}, goals={}, canWrite=false, TOKEN='';
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
  function view(){var h=(location.hash||'').slice(1);return ['list','gantt','calendar','goal','profit','log'].indexOf(h)>=0?h:'list';}
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
    var tl=document.querySelector('.tools');if(tl)tl.style.display=view()==='goal'?'none':'';
    ({list:rList,gantt:rGantt,calendar:rCal,goal:rGoal,profit:rProfit,log:rLog})[view()]();
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
        +(s&&e?'<div class="gspan" style="background:'+gc(g.id)+';left:'+x(s)+'px;width:'+Math.max(6,x(e)-x(s)+PX)+'px"></div>':'')
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
        +dt.map(function(t){return '<button type="button" class="chip '+state(t)+'" data-edit="'+esc(t.id)+'" title="'+esc(t.t)+(t.owner?'（担当：'+esc(t.owner)+'）':'')+'" style="box-shadow:inset 4px 0 0 '+gc(t.g)+'">'+(t.owner?'['+esc(t.owner)+'] ':'')+esc(t.t)+'</button>';}).join('')
        +(dt.length?'<span class="cnt">'+dt.length+'件</span>':'')+'</div>';
    }
    var mk=calMonth.getFullYear()+'-'+String(calMonth.getMonth()+1).padStart(2,'0');
    var ag=ts.filter(function(t){return (t.d||'').slice(0,7)===mk;});
    app.innerHTML='<div class="mstrip">'+strip+'</div><div class="cal">'+cells+'</div>'
      +'<div class="agenda"><h3>'+calMonth.getFullYear()+'年'+(calMonth.getMonth()+1)+'月が期限のタスク（'+ag.length+'件）</h3><ul>'+(ag.length?ag.map(taskLi).join(''):'<li class="task"><span></span><span class="t">この月が期限のタスクはありません。</span></li>')+'</ul></div>';
  }

  var BP0='2027-01', BP1='2028-12', budOpen={}, note=null;
  var BRANGES={y1:['2027-01','2027-12','1年目（2027年1月〜12月）'],y2:['2028-01','2028-12','2年目（2028年1月〜12月）'],all:['2027-01','2028-12','2年合計（2027年1月〜2028年12月）']}, bsel='y1';
  try{bsel=localStorage.getItem('todo-bsel')||'y1';if(!BRANGES[bsel])bsel='y1';}catch(e){}
  function yen(v){return (v<0?'▲':'')+Math.abs(Math.round(v)).toLocaleString('ja-JP');}
  function num1(v){return (Math.round(v*10)/10).toLocaleString('ja-JP',{maximumFractionDigits:1});}
  function ymN(s){var a=String(s).split('-');return (+a[0])*12+(+a[1])-1;}
  function ymS(n){return Math.floor(n/12)+'-'+String(n%12+1).padStart(2,'0');}
  function MONTHS(){var R=BRANGES[bsel],r=[];for(var i=ymN(R[0]);i<=ymN(R[1]);i++)r.push(ymS(i));return r;}
  function inM(l,m){var x=ymN(m);return x>=ymN(l.from)&&x<=ymN(l.to);}
  function memb(l,m){var c=+l.c0||0,x=null;for(var i=ymN(l.from);i<=ymN(m);i++){var ym=ymS(i),st=c,nw=+l.cnew||0,sp=(l.cstopFrom&&ymN(ym)>=ymN(l.cstopFrom))?Math.min(st,+l.cstop||0):0;c=st+nw-sp;x={start:st,nw:nw,stop:sp,net:nw-sp,end:c};}return x||{start:0,nw:0,stop:0,net:0,end:+l.c0||0};}
  function netM(l,m){if(l.bill){var x=memb(l,m);return (+l.m||0)*(l.bill==='new'?x.nw:x.start);}return (+l.m||0)+(+l.inc||0)*Math.max(0,ymN(m)-ymN(l.from));}
  function gross(l,m){return netM(l,m)*(l.tax?1.1:1);}
  function lineYear(l){return MONTHS().reduce(function(s,m){return s+(inM(l,m)?gross(l,m):0);},0);}
  function ctax(b,m){var v=b.lines.reduce(function(s,l){return s+(l.tax&&inM(l,m)?(l.k==='rev'?1:-1)*netM(l,m)*0.1:0);},0);return Math.max(0,v);}
  function ymJ(s){var a=String(s).split('-');return a[0]+'年'+(+a[1])+'月';}
  function per(l){return (l.from===BP0&&l.to===BP1)?'全期間':(l.from===l.to?ymJ(l.from)+'のみ':ymJ(l.from)+'〜'+ymJ(l.to));}
  function budTotals(b){var r=0,e=0;b.lines.forEach(function(l){if(l.k==='rev')r+=lineYear(l);else e+=lineYear(l);});MONTHS().forEach(function(m){e+=ctax(b,m);});return {r:r,e:e,p:r-e};}
  function budMonth(b,k,m){return b.lines.reduce(function(s,l){return s+(l.k===k&&inM(l,m)?gross(l,m):0);},0)+(k==='exp'?ctax(b,m):0);}
  function budNums(t){return '<div class="bnums"><div><span>期間売上</span><b>'+yen(t.r)+'</b></div><div><span>期間支出</span><b>'+yen(t.e)+'</b></div><div class="'+(t.p<0?'neg':'pos')+'"><span>損益</span><b>'+yen(t.p)+'</b></div><div><span>月平均売上</span><b>'+yen(t.r/MONTHS().length)+'</b></div></div>';}
  function qtyM(l,m){return (+l.qty||0)+(+l.qinc||0)*Math.max(0,ymN(m)-ymN(l.from));}
  function hasQty(l){return !l.bill&&((+l.qty||0)>0||(+l.qinc||0)>0);}
  function hrsM(b,m){return b.lines.reduce(function(s,l){if(!inM(l,m))return s;if(l.bill){var x=memb(l,m);return s+(l.bill==='base'?x.end*(+l.hpu||0):x.nw*(+l.hpnew||0));}return s+(hasQty(l)?qtyM(l,m)*(+(l.hpq||l.hpu)||0):0);},0);}
  function act(b,m){return actuals[b.id+'|'+m];}
  function actDone(b,ms){return ms.filter(function(m){var a=act(b,m);return a&&(a.rev!=null||a.exp!=null);});}
  function actSum(b,ms,k){return ms.reduce(function(s,m){var a=act(b,m);return s+(a&&a[k]!=null?+a[k]:0);},0);}
  function yojitsu(b){var ms=actDone(b,MONTHS());if(!ms.length)return null;
    var br=ms.reduce(function(s,m){return s+budMonth(b,'rev',m);},0),be=ms.reduce(function(s,m){return s+budMonth(b,'exp',m);},0);
    var ar=actSum(b,ms,'rev'),ae=actSum(b,ms,'exp');return {n:ms.length,br:br,be:be,ar:ar,ae:ae};}
  function yjLine(y){if(!y)return '<div class="byj none">実績：未入力</div>';
    var rate=y.br?Math.round(y.ar/y.br*100):0,d=(y.ar-y.ae)-(y.br-y.be);
    return '<div class="byj">実績（入力済み '+y.n+'か月）：売上 <b>'+yen(y.ar)+'</b>（予算比 '+rate+'%）／損益 <b class="'+(y.ar-y.ae<0?'neg':'')+'">'+yen(y.ar-y.ae)+'</b>（予算との差 <b class="'+(d<0?'neg':'')+'">'+(d>=0?'+':'')+yen(d)+'</b>）</div>';}
  function budTable(b){
    var ms=MONTHS();
    var head='<tr><th class="bn">事業</th>'+ms.map(function(m){var a=m.split('-');return '<th class="n">'+(a[1]==='01'||m===BP0?a[0].slice(2)+'/':'')+(+a[1])+'月</th>';}).join('')+'<th class="n">期間計</th><th></th></tr>';
    function rows(k){return b.lines.filter(function(l){return l.k===k;}).map(function(l){
      var sm=(l.bill?(l.bill==='new'?'新規1人あたり ':'利用者1人あたり 月')+(+l.m||0).toLocaleString('ja-JP',{maximumFractionDigits:2})+'万円':'月'+num1(gross(l,l.from))+'万円'+(l.tax?'（税抜'+num1(+l.m||0)+'）':'')+(+l.inc?'から毎月'+num1(+l.inc)+'万円ずつ増加':''))+'／'+per(l);
      return '<tr><td class="bn"><div class="bline"><span class="btxt"><b title="'+esc(l.n)+'">'+esc(l.n)+'</b><small title="'+esc(sm+(l.note?'／'+l.note:''))+'">'+esc(sm)+(l.note?'／'+esc(l.note):'')+'</small></span><button type="button" class="binfo" data-binfo="'+esc(b.id)+'" data-line="'+esc(l.id)+'" aria-label="説明を見る">i</button></div></td>'
        +ms.map(function(m){return '<td class="n'+(inM(l,m)?'':' off')+'">'+(inM(l,m)?num1(gross(l,m)):'–')+'</td>';}).join('')
        +'<td class="n"><b>'+num1(lineYear(l))+'</b></td>'
        +'<td class="bact">'+(canWrite?'<button type="button" class="bbtn" data-bed="'+esc(b.id)+'" data-line="'+esc(l.id)+'">修正</button><button type="button" class="bbtn" data-bcp="'+esc(b.id)+'" data-line="'+esc(l.id)+'">複製</button>':'')+'</td></tr>'
      +(l.bill==='base'?[['既存（月初）','start'],['新規','nw'],['利用中止','stop'],['純増','net'],['利用者（月末）','end']].map(function(r){return '<tr class="bqty'+(r[1]==='end'?' bend':'')+'"><td class="bn">'+r[0]+'（人）</td>'+ms.map(function(m){if(!inM(l,m))return '<td></td>';var v=memb(l,m)[r[1]];return '<td class="n">'+(r[1]==='net'&&v>0?'+':'')+(r[1]==='stop'&&v?'▲':'')+v+'</td>';}).join('')+'<td></td><td></td></tr>';}).join(''):'')
      +(l.bill==='new'?'<tr class="bqty"><td class="bn">新規（人）</td>'+ms.map(function(m){return '<td class="n">'+(inM(l,m)?memb(l,m).nw:'')+'</td>';}).join('')+'<td></td><td></td></tr>':'')
      +(hasQty(l)?'<tr class="bqty"><td class="bn">'+esc(l.qlabel||'人数')+'（'+esc(l.unit||'人')+'）'+(+(l.hpq||l.hpu)?'／稼働 '+num1(+(l.hpq||l.hpu))+'時間・'+esc(l.unit||'人')+'あたり':'')+'</td>'+ms.map(function(m){return '<td class="n">'+(inM(l,m)?num1(qtyM(l,m)):'')+'</td>';}).join('')+'<td></td><td></td></tr>':'');}).join('');}
    function sum(lbl,f,cls){return '<tr class="bsum '+(cls||'')+'"><td class="bn">'+lbl+'</td>'+ms.map(function(m){var v=f(m);return '<td class="n'+(v<0?' neg':'')+'">'+(v<0?'▲':'')+num1(Math.abs(v))+'</td>';}).join('')+'<td class="n">'+(function(){var t=ms.reduce(function(s,m){return s+f(m);},0);return (t<0?'▲':'')+num1(Math.abs(t));})()+'</td><td></td></tr>';}
    return '<div class="bscroll"><table class="bmon"><thead><tr class="bsec"><td class="bn" colspan="'+(ms.length+3)+'">売上</td></tr>'+head+'</thead><tbody>'+rows('rev')
      +sum('売上計',function(m){return budMonth(b,'rev',m);},'rev')+'</tbody>'
      +'<tbody><tr class="bsec"><td class="bn" colspan="'+(ms.length+3)+'">支出</td></tr>'+rows('exp')+taxRow(b,ms)
      +sum('支出計',function(m){return budMonth(b,'exp',m);})+'</tbody>'
      +'<tbody>'+sum('損益（予算）',function(m){return budMonth(b,'rev',m)-budMonth(b,'exp',m);},'pl')+'</tbody>'
      +'<tbody><tr class="bsec act"><td class="bn" colspan="'+(ms.length+3)+'">実績（税込・月ごとに入力）</td></tr>'
      +['rev','exp'].map(function(k){return '<tr class="bact-row"><td class="bn">'+(k==='rev'?'売上（実績）':'支出（実績）')+'</td>'+ms.map(function(m){var a=act(b,m),v=a&&a[k]!=null?a[k]:null;return '<td class="n"><button type="button" class="bcell'+(v==null?' empty':'')+'" data-yj="'+esc(b.id)+'" data-ym="'+m+'"'+(canWrite?'':' disabled')+' aria-label="'+ymJ(m)+'の実績を入力">'+(v==null?'＋':num1(+v))+'</button></td>';}).join('')+'<td class="n">'+num1(actSum(b,ms,k))+'</td><td></td></tr>';}).join('')
      +'<tr class="bsum"><td class="bn">損益（実績）</td>'+ms.map(function(m){var a=act(b,m);if(!a)return '<td></td>';var v=(+a.rev||0)-(+a.exp||0);return '<td class="n'+(v<0?' neg':'')+'">'+(v<0?'▲':'')+num1(Math.abs(v))+'</td>';}).join('')+'<td class="n">'+(function(){var v=actSum(b,ms,'rev')-actSum(b,ms,'exp');return (v<0?'▲':'')+num1(Math.abs(v));})()+'</td><td></td></tr>'
      +'<tr class="bsum diff"><td class="bn">予算との差（損益）</td>'+ms.map(function(m){var a=act(b,m);if(!a)return '<td></td>';var v=((+a.rev||0)-(+a.exp||0))-(budMonth(b,'rev',m)-budMonth(b,'exp',m));return '<td class="n'+(v<0?' neg':'')+'">'+(v<0?'▲':'+')+num1(Math.abs(v))+'</td>';}).join('')+'<td></td><td></td></tr></tbody>'
      +(b.lines.some(function(l){return (l.bill&&(+l.hpu||+l.hpnew))||(hasQty(l)&&+(l.hpq||l.hpu));})?'<tbody><tr class="bsum hrs"><td class="bn">稼働時間（月・合計）</td>'+ms.map(function(m){var h=hrsM(b,m);return '<td class="n">'+(h?num1(h):'')+'</td>';}).join('')+'<td class="n">'+num1(ms.reduce(function(s,m){return s+hrsM(b,m);},0))+'</td><td></td></tr></tbody>':'')+'</table></div>';
  }
  function taxRow(b,ms){var t=ms.reduce(function(s,m){return s+ctax(b,m);},0);if(!t)return '';
    return '<tr class="btax"><td class="bn"><b>消費税（納付見込み・自動計算）</b><small>課税売上の10% − 課税支出の10%。実際の納付は中間・確定申告時</small></td>'+ms.map(function(m){var v=ctax(b,m);return '<td class="n'+(v?'':' off')+'">'+(v?num1(v):'–')+'</td>';}).join('')+'<td class="n"><b>'+num1(t)+'</b></td><td></td></tr>';}
  function rBudget(){
    if(!budgets.length)return '';
    var all={r:0,e:0,p:0};budgets.forEach(function(b){var t=budTotals(b);all.r+=t.r;all.e+=t.e;all.p+=t.p;});
    var h='<section class="budget"><h2>予実（会社別の予算と実績）<small>単位：万円（税込）。予算は保守的な見込み、実績は月ごとに入力</small></h2>'
      +'<div class="bsel" role="group" aria-label="表示する期間">'+Object.keys(BRANGES).map(function(k){return '<button type="button" data-bsel="'+k+'" aria-pressed="'+(k===bsel)+'">'+BRANGES[k][2]+'</button>';}).join('')+'</div>'
      +'<div class="bgroup"><h3>グループ全体（予算）</h3>'+budNums(all)+(function(){var Y=budgets.map(yojitsu).filter(Boolean);if(!Y.length)return yjLine(null);var t={n:Math.max.apply(null,Y.map(function(y){return y.n;})),br:0,be:0,ar:0,ae:0};Y.forEach(function(y){t.br+=y.br;t.be+=y.be;t.ar+=y.ar;t.ae+=y.ae;});return yjLine(t);})()+'</div>';
    budgets.forEach(function(b){var t=budTotals(b);
      h+='<details class="bco" data-bco="'+esc(b.id)+'"'+(budOpen[b.id]?' open':'')+'><summary><span class="bname">'+esc(b.name)+'<small>稼働 '+esc(b.staff)+'</small></span>'+(b.purpose?'<span class="bpurp" title="'+esc(b.purpose)+'"><em>目的</em>'+esc(b.purpose)+'</span>':'')+budNums(t)+'<span class="bopen">内訳</span>'+yjLine(yojitsu(b))+'</summary>'
        +'<div class="bdetail">'+(b.purpose?'<p class="bpurp-full"><em>目的</em>'+esc(b.purpose)+'</p>':'')+'<p>'+esc(b.note)+'</p><p class="be">損益分岐に必要な月売上：<b>'+yen(t.e/MONTHS().length)+'</b> 万円（期間平均）'
        +(canWrite?'<button type="button" class="btn primary badd" data-badd="'+esc(b.id)+'">＋ 事業を追加</button>':'')+'</p>'
        +budTable(b)+'</div></details>';});
    return h+'</section><h2 class="ptitle">事業ごとの利益化の目標</h2>';
  }
  function findLine(bid,lid){var b=budgets.filter(function(x){return x.id===bid;})[0];return b?b.lines.filter(function(l){return l.id===lid;})[0]:null;}
  function openNote(bid,line,mode,anchor){
    closeNote();
    var b=budgets.filter(function(x){return x.id===bid;})[0]; if(!b)return;
    var l=line?JSON.parse(JSON.stringify(line)):{k:'rev',n:'',m:'',from:BP0,to:BP1,note:'',tax:true};
    var copyOpts='<option value="">（新しく入力する）</option>'+budgets.map(function(x){return '<optgroup label="'+esc(x.name)+'">'+x.lines.map(function(y){return '<option value="'+esc(x.id+'|'+y.id)+'">'+(y.k==='exp'?'［支出］':'［売上］')+esc(y.n)+'（月'+num1(+y.m||0)+'）</option>';}).join('')+'</optgroup>';}).join('');
    var el=document.createElement('div'); el.className='bnote'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','予算の入力');
    el.innerHTML='<div class="bnote-h"><b>'+(mode==='edit'?'事業を修正':mode==='copy'?'事業を複製して追加':'事業を追加')+'</b><span>'+esc(b.name)+'</span><button type="button" class="bx" data-bclose aria-label="閉じる">×</button></div>'
      +(mode==='edit'?'':'<label>既存の事業からコピー<select data-bf="copy">'+copyOpts+'</select></label>')
      +'<div class="bnote-r"><label>区分<select data-bf="k"><option value="rev">売上</option><option value="exp">支出</option></select></label>'
      +'<label>月額（万円）<input data-bf="m" type="number" step="0.1" inputmode="decimal"></label></div>'
      +'<label>毎月の増加額（万円・任意）<input data-bf="inc" type="number" step="0.1" inputmode="decimal" placeholder="例：契約者が毎月2人増える → 1.1"></label>'
      +'<details class="bmem"'+(l.bill?' open':'')+'><summary>利用者数で計算する（新規・中止・月末人数）</summary>'
      +'<label>計算のしかた<select data-bf="bill"><option value="">使わない（月額をそのまま使う）</option><option value="base">月初の利用者数 × 単価（月額利用料など）</option><option value="new">新規の人数 × 単価（初期費用など）</option></select></label>'
      +'<div class="bnote-r"><label>開始時の利用者（人）<input data-bf="c0" type="number" step="1"></label><label>毎月の新規（人）<input data-bf="cnew" type="number" step="1"></label></div>'
      +'<div class="bnote-r"><label>毎月の利用中止（人）<input data-bf="cstop" type="number" step="1"></label><label>中止を見込む月から<input data-bf="cstopFrom" type="month"></label></div>'
      +'<div class="bnote-r"><label>稼働（時間/利用者・月）<input data-bf="hpu" type="number" step="0.1"></label><label>稼働（時間/新規1人）<input data-bf="hpnew" type="number" step="0.1"></label></div>'
      +'<p class="bprev">このときの「月額」は1人あたりの単価（万円）です</p></details>'
      +'<div class="bnote-r"><label>人数など（開始時）<input data-bf="qty" type="number" step="1" inputmode="numeric"></label><label>毎月の増加<input data-bf="qinc" type="number" step="1" inputmode="numeric"></label></div>'
      +'<div class="bnote-r"><label>単位<input data-bf="unit" type="text" maxlength="10" placeholder="人・件・棟"></label><label>1単位の稼働（時間/月）<input data-bf="hpq" type="number" step="0.1" inputmode="decimal"></label></div>'
      +'<label class="bchk"><input data-bf="tax" type="checkbox"> 消費税10%がかかる（月額は税抜で入力）</label><p class="bprev"></p>'
      +'<label>事業名・相手先<input data-bf="n" type="text" maxlength="200" placeholder="例：医療法人〇〇 訪看コンサル"></label>'
      +'<div class="bnote-r"><label>開始月<input data-bf="from" type="month" min="'+BP0+'" max="'+BP1+'"></label><label>終了月<input data-bf="to" type="month" min="'+BP0+'" max="'+BP1+'"></label></div>'
      +'<label>メモ（前提など）<textarea data-bf="note" rows="2" maxlength="500"></textarea></label>'
      +'<p class="bnote-err" aria-live="polite"></p>'
      +'<div class="bnote-b">'+(mode==='edit'?'<button type="button" class="btn danger" data-bdel>削除</button>':'<span></span>')+'<span><button type="button" class="btn" data-bclose>やめる</button> <button type="button" class="btn primary" data-bsave>保存</button></span></div>';
    function prev(){var m=+el.querySelector('[data-bf=m]').value||0,t=el.querySelector('[data-bf=tax]').checked;el.querySelector('.bprev').textContent=t?'税込 月'+num1(m*1.1)+'万円で表示されます':'入力した金額のまま表示されます';}
    function fill(x){['k','n','m','inc','qty','qinc','unit','hpq','hpu','bill','c0','cnew','cstop','cstopFrom','hpnew','from','to','note'].forEach(function(f){el.querySelector('[data-bf='+f+']').value=x[f]==null||x[f]===0?(f==='m'&&x[f]===0?0:''):x[f];});el.querySelector('[data-bf=tax]').checked=!!x.tax;prev();}
    fill(l);
    if(mode==='copy')el.querySelector('[data-bf=n]').value=l.n+'（コピー）';
    el.addEventListener('input',function(e){if(e.target.dataset.bf==='m'||e.target.dataset.bf==='tax')prev();});
    el.addEventListener('change',function(e){if(e.target.dataset.bf==='tax')prev();});
    var cp=el.querySelector('[data-bf=copy]');
    if(cp)cp.addEventListener('change',function(){if(!cp.value)return;var p=cp.value.split('|'),src=findLine(p[0],p[1]);if(src){fill(src);el.querySelector('[data-bf=n]').select();}});
    document.body.appendChild(el);
    var r=anchor&&anchor.getBoundingClientRect(), w=Math.min(360,window.innerWidth-24);
    el.style.width=w+'px';
    var left=r?Math.min(Math.max(12,r.right-w),window.innerWidth-w-12):(window.innerWidth-w)/2;
    var top=r?r.bottom+8:80; if(top+el.offsetHeight>window.innerHeight-12)top=Math.max(12,(r?r.top:window.innerHeight)-el.offsetHeight-8);
    el.style.left=left+'px'; el.style.top=top+'px';
    note={el:el,bid:bid,lid:mode==='edit'?l.id:null};
    (cp||el.querySelector('[data-bf=n]')).focus();
    el.addEventListener('keydown',function(e){if(e.key==='Escape')closeNote();});
    el.addEventListener('click',async function(e){
      if(e.target.closest('[data-bclose]')){closeNote();return;}
      var del=e.target.closest('[data-bdel]'), save=e.target.closest('[data-bsave]');
      if(!del&&!save)return;
      var lines=b.lines.map(function(x){return JSON.parse(JSON.stringify(x));}), err=el.querySelector('.bnote-err');
      if(del){if(del.dataset.armed!=='1'){del.dataset.armed='1';del.textContent='本当に削除';return;}lines=lines.filter(function(x){return x.id!==note.lid;});}
      else{
        var v={};['k','n','m','from','to','note'].forEach(function(f){v[f]=el.querySelector('[data-bf='+f+']').value.trim();});v.tax=el.querySelector('[data-bf=tax]').checked;v.inc=Math.round((+el.querySelector('[data-bf=inc]').value||0)*10)/10;v.qty=+el.querySelector('[data-bf=qty]').value||0;v.qinc=+el.querySelector('[data-bf=qinc]').value||0;v.unit=el.querySelector('[data-bf=unit]').value.trim();v.hpq=+el.querySelector('[data-bf=hpq]').value||0;v.hpu=+el.querySelector('[data-bf=hpu]').value||0;['bill','cstopFrom'].forEach(function(f){v[f]=el.querySelector('[data-bf='+f+']').value;});['c0','cnew','cstop','hpnew'].forEach(function(f){v[f]=+el.querySelector('[data-bf='+f+']').value||0;});
        if(!v.n){err.textContent='事業名を入力してください';el.querySelector('[data-bf=n]').focus();return;}
        if(v.m===''||isNaN(+v.m)){err.textContent='月額を数字で入力してください';el.querySelector('[data-bf=m]').focus();return;}
        if(!v.from||!v.to||v.from>v.to){err.textContent='開始月と終了月を確認してください';return;}
        v.m=Math.round(+v.m*10)/10;
        if(note.lid){lines=lines.map(function(x){return x.id===note.lid?Object.assign(x,v):x;});}
        else{v.id='bl'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);lines.push(v);}
      }
      try{await api('PUT','/api/budgets/'+bid,{lines:lines});budOpen[bid]=true;closeNote();setStatus('予算を保存しました');await load();}catch(x){fail(x);}
    });
  }
  function openActual(bid,ym,anchor){
    closeNote();var b=budgets.filter(function(x){return x.id===bid;})[0];if(!b)return;var a=act(b,ym)||{};
    var el=document.createElement('div');el.className='bnote';el.setAttribute('role','dialog');el.setAttribute('aria-label','実績の入力');
    el.innerHTML='<div class="bnote-h"><b>'+ymJ(ym)+'の実績</b><span>'+esc(b.name)+'</span><button type="button" class="bx" data-bclose aria-label="閉じる">×</button></div>'
      +'<p class="bprev">予算：売上 '+num1(budMonth(b,'rev',ym))+'万円／支出 '+num1(budMonth(b,'exp',ym))+'万円（税込）</p>'
      +'<div class="bnote-r"><label>売上（万円・税込）<input data-af="rev" type="number" step="0.1" inputmode="decimal"></label><label>支出（万円・税込）<input data-af="exp" type="number" step="0.1" inputmode="decimal"></label></div>'
      +'<label>メモ<textarea data-af="note" rows="2" maxlength="500" placeholder="例：レジデンス 2日分、慈誠会 12月分"></textarea></label>'
      +'<p class="bnote-err" aria-live="polite"></p>'
      +'<div class="bnote-b">'+(a.id?'<button type="button" class="btn danger" data-adel>消す</button>':'<span></span>')+'<span><button type="button" class="btn" data-bclose>やめる</button> <button type="button" class="btn primary" data-asave>保存</button></span></div>';
    el.querySelector('[data-af=rev]').value=a.rev==null?'':a.rev;el.querySelector('[data-af=exp]').value=a.exp==null?'':a.exp;el.querySelector('[data-af=note]').value=a.note||'';
    document.body.appendChild(el);
    var r=anchor.getBoundingClientRect(),w=Math.min(340,window.innerWidth-24);el.style.width=w+'px';
    el.style.left=Math.min(Math.max(12,r.left-w/2),window.innerWidth-w-12)+'px';var top=r.bottom+8;if(top+el.offsetHeight>window.innerHeight-12)top=Math.max(12,r.top-el.offsetHeight-8);el.style.top=top+'px';
    note={el:el,bid:bid,lid:null};el.querySelector('[data-af=rev]').focus();
    el.addEventListener('keydown',function(e){if(e.key==='Escape')closeNote();});
    el.addEventListener('click',async function(e){
      if(e.target.closest('[data-bclose]')){closeNote();return;}
      var del=e.target.closest('[data-adel]'),save=e.target.closest('[data-asave]');if(!del&&!save)return;
      var body={rev:null,exp:null,note:''};
      if(save){var rv=el.querySelector('[data-af=rev]').value.trim(),ev=el.querySelector('[data-af=exp]').value.trim();
        if((rv&&isNaN(+rv))||(ev&&isNaN(+ev))){el.querySelector('.bnote-err').textContent='数字で入力してください';return;}
        body={rev:rv===''?null:+rv,exp:ev===''?null:+ev,note:el.querySelector('[data-af=note]').value.trim()};}
      try{await api('PUT','/api/actuals/'+bid+'/'+ym,body);budOpen[bid]=true;closeNote();setStatus('実績を保存しました');await load();}catch(x){fail(x);}
    });
  }
  function closeNote(){if(note&&note.el)note.el.remove();note=null;}

  /* ---------- 目標ツリー ---------- */
  var PEOPLE=['大下甚','伊藤晋','森久保康希'], gsel='大下甚';
  try{gsel=localStorage.getItem('todo-gsel')||gsel;if(PEOPLE.indexOf(gsel)<0)gsel='大下甚';}catch(e){}
  function goalOf(id){return goals[id]||{id:id,role:'',ideal:'',income:null,year:'',tree:[]};}
  function gnFind(arr,id,par){for(var i=0;i<arr.length;i++){if(arr[i].id===id)return {n:arr[i],arr:arr,i:i,par:par};var r=gnFind(arr[i].kids||[],id,arr[i]);if(r)return r;}return null;}
  function bud(id){return budgets.filter(function(b){return b.id===id;})[0];}
  var gEdit=false;
  function coShort(s){return String(s||'').replace(/^(株式会社|NPO法人|特定非営利活動法人)\s*/,'');}
  function gnLink(n){
    var out='';
    if(n.co==='*'){var t={r:0,e:0,p:0};budgets.forEach(function(b){var x=budTotals(b);t.r+=x.r;t.e+=x.e;t.p+=x.p;});
      out+='<span class="gm"><span class="gco">グループ全体</span>売上 <b>'+yen(t.r)+'</b>万円<i>利益 <b class="'+(t.p<0?'neg':'pos')+'">'+yen(t.p)+'</b>万円</i></span>';}
    else if(n.co){var b=bud(n.co);if(b){
      var who='<span class="gco">'+esc(coShort(b.name))+'</span>';
      if(n.line){var l=b.lines.filter(function(x){return x.id===n.line;})[0];
        if(l)out+='<span class="gm">'+who+(l.k==='exp'?'支出 ':'売上 ')+'<b>'+yen(lineYear(l))+'</b>万円</span>';}
      else{var t2=budTotals(b),y=yojitsu(b);
        out+='<span class="gm">'+who+'売上 <b>'+yen(t2.r)+'</b>万円<i>利益 <b class="'+(t2.p<0?'neg':'pos')+'">'+yen(t2.p)+'</b>万円</i>'+(y?'<i class="ga">実績 '+yen(y.ar)+'（'+y.n+'か月）</i>':'')+'</span>';}
    }}
    if(n.g&&groups[n.g]){var all=Object.keys(tasks).filter(function(k){return tasks[k].g===n.g;}),dn=all.filter(function(k){return tasks[k].done;}).length;
      out+='<span class="gm gt" title="'+esc(groups[n.g].name)+'">TODO <span class="gbarm"><i style="width:'+(all.length?dn/all.length*100:0)+'%"></i></span><b>'+dn+'/'+all.length+'</b></span>';}
    return out;
  }
  function splitPeriod(t){var m=String(t).match(/^(.*?)[（(]([^（()）]*\d{4}[^（()）]*)[）)]\s*$/);return m?{t:m[1],p:m[2]}:{t:t,p:''};}
  var NOWYM=ymd(today).slice(0,7);
  function dueChip(n){if(!n.due)return '';var late=!n.done&&n.due<NOWYM;return '<span class="gdue'+(n.done?' ok':late?' late':'')+'">'+(n.done?'完了 ':late?'期限切れ ':'')+ymJ(n.due)+'</span>';}
  function gGoal(n){return n.goal?'<p class="ggoal"><em>ゴール</em>'+esc(n.goal)+'</p>':'';}
  function gnActs(arr){
    if(!arr||!arr.length)return '';
    return '<ul class="gact">'+arr.map(function(n){var L=gnLink(n);
      return '<li class="'+(n.done?'done':'')+'"><div class="gal">'+dueChip(n)+'<span class="gtt">'+esc(n.t)+'</span>'+(gEdit?gActs(n.id,false):'')+'</div>'
        +(n.goal?'<div class="gag">'+esc(n.goal)+'</div>':'')+(L?'<div class="gms">'+L+'</div>':'')+gnActs(n.kids)+'</li>';}).join('')+'</ul>';
  }
  function gActs(id,step){return '<span class="gacts"><button type="button" data-gn="'+esc(id)+'">修正</button><button type="button" data-gnadd="'+esc(id)+'">＋ '+(step?'追加':'下に追加')+'</button><button type="button" class="del" data-gndel="'+esc(id)+'">削除</button></span>';}
  function incomeTxt(g){return g.income!=null&&g.income!==''?yen(+g.income)+'万円'+(g.year?'（'+esc(g.year)+'年）':''):'未記入';}
  function rGoal(){
    var G=goalOf('_group'), cur=goalOf(gsel), cw=canWrite;
    var h='<section class="goals">'
      +'<div class="gvision"><em>グループの理想</em>'+(cw&&gEdit?'<button type="button" class="gvtxt" data-gperson="_group">':'<p class="gvtxt">')+(G.ideal?esc(G.ideal):'<span class="gnone">未記入</span>')+(cw&&gEdit?'</button>':'</p>')
      +'</div>'
      +'<div class="gpeople" role="tablist">'+PEOPLE.map(function(p){var g=goalOf(p);
        return '<button type="button" role="tab" class="gp" data-gsel="'+esc(p)+'" aria-selected="'+(p===gsel)+'"><span class="gpn">'+esc(p)+(g.role?'<small>'+esc(g.role)+'</small>':'')+'</span>'
          +'<span class="gpi">'+(g.ideal?esc(g.ideal):'目指す姿：未記入')+'</span></button>';}).join('')+'</div>'
      +'<div class="ghero"><div class="ghero-m"><em>'+esc(gsel)+'が目指す姿</em><p>'+(cur.ideal?esc(cur.ideal):'<span class="gnone">未記入</span>')+'</p></div>'
      +'<div class="ghero-y"><em>目標年収</em><b>'+incomeTxt(cur)+'</b></div>'
      +(cw&&gEdit?'<button type="button" class="btn ghost" data-gperson="'+esc(gsel)+'">目指す姿・年収を修正</button>':'')+'</div>'
      +'<div class="gplanh"><h3>そのためにやっていくこと</h3>'+(cw?'<button type="button" class="btn '+(gEdit?'primary':'ghost')+' gedit" data-gedit>'+(gEdit?'編集を終える':'追加・修正・削除する')+'</button>':'')+'<div class="bsel" role="group" aria-label="数字の期間">'+Object.keys(BRANGES).map(function(k){return '<button type="button" data-bsel="'+k+'" aria-pressed="'+(k===bsel)+'">'+BRANGES[k][2].replace(/（.*$/,'')+'</button>';}).join('')+'</div></div>';
    if(!cur.tree.length&&!gEdit)h+='<p class="gempty">まだ入力されていません。'+(cw?'「編集する」から追加できます。':'')+'</p>';
    else{
      h+='<ol class="gsteps">'+cur.tree.map(function(n,i){var sp=splitPeriod(n.t),L=gnLink(n);
        return '<li class="gstep"><div class="gside"><div class="gsh"><span class="gno">STEP '+(i+1)+'</span>'+(sp.p?'<span class="gper">'+esc(sp.p)+'</span>':'')+dueChip(n)+'</div>'
          +'<h4>'+esc(sp.t)+'</h4>'+(gEdit?gActs(n.id,true):'')+gGoal(n)+(L?'<div class="gms">'+L+'</div>':'')+(n.note?'<p class="gnote2">'+esc(n.note)+'</p>':'')+'</div>'
          +'<div class="gcards">'+(n.kids||[]).map(function(c){var Lc=gnLink(c);
            return '<div class="gcard'+(c.done?' done':'')+'"><div class="gch"><b>'+esc(c.t)+'</b>'+dueChip(c)+'</div>'+(gEdit?gActs(c.id,false):'')+(Lc?'<div class="gms">'+Lc+'</div>':'')+gGoal(c)+(c.note?'<p class="gnote2">'+esc(c.note)+'</p>':'')+gnActs(c.kids)+'</div>';}).join('')
          +(gEdit?'<button type="button" class="gaddk gcard" data-gnadd="'+esc(n.id)+'">＋ 会社・取り組みを追加</button>':'')+'</div></li>';}).join('')
        +(gEdit?'<li class="gstep gnew"><button type="button" class="gaddk" data-gnadd="">＋ STEPを追加</button></li>':'')+'</ol>';
    }
    h+='<p class="gfoot">数字は予実の'+esc(BRANGES[bsel][2])+'の予算（万円・税込）。「TODO」は関連タスクの完了数。</p></section>';
    app.innerHTML=h;
  }
  function placeNote(el,anchor){
    document.body.appendChild(el);
    var r=anchor&&anchor.getBoundingClientRect(), w=Math.min(380,window.innerWidth-24);
    el.style.width=w+'px';
    var left=r?Math.min(Math.max(12,r.left),window.innerWidth-w-12):(window.innerWidth-w)/2;
    var top=r?r.bottom+8:80; if(top+el.offsetHeight>window.innerHeight-12)top=Math.max(12,(r?r.top:window.innerHeight)-el.offsetHeight-8);
    el.style.left=left+'px'; el.style.top=top+'px';
    el.addEventListener('keydown',function(e){if(e.key==='Escape')closeNote();});
  }
  async function saveGoal(id,g){var o=goalOf(id);var body={role:g.role!=null?g.role:o.role,ideal:g.ideal!=null?g.ideal:o.ideal,income:g.income!==undefined?g.income:o.income,year:g.year!=null?g.year:o.year,tree:g.tree||o.tree};
    await api('PUT','/api/goals/'+encodeURIComponent(id),body);}
  function openPerson(id,anchor){
    closeNote(); var g=goalOf(id), grp=id==='_group';
    var el=document.createElement('div'); el.className='bnote'; el.setAttribute('role','dialog');
    el.innerHTML='<div class="bnote-h"><b>'+(grp?'グループの理想':'理想と目標年収')+'</b><span>'+(grp?'':esc(id))+'</span><button type="button" class="bx" data-bclose aria-label="閉じる">×</button></div>'
      +(grp?'':'<label>立場<input data-gf="role" type="text" maxlength="40" placeholder="例：代表・幹部"></label>')
      +'<label>理想（一言）<textarea data-gf="ideal" rows="3" maxlength="300"></textarea></label>'
      +(grp?'':'<div class="bnote-r"><label>目標年収（万円）<input data-gf="income" type="number" step="1" inputmode="numeric"></label><label>達成する年<input data-gf="year" type="number" min="2026" max="2060" step="1" placeholder="例：2030"></label></div>')
      +'<p class="bnote-err" aria-live="polite"></p><div class="bnote-b"><span></span><span><button type="button" class="btn" data-bclose>やめる</button> <button type="button" class="btn primary" data-gsave>保存</button></span></div>';
    ['role','ideal','income','year'].forEach(function(f){var i=el.querySelector('[data-gf='+f+']');if(i)i.value=g[f]==null?'':g[f];});
    placeNote(el,anchor); note={el:el}; el.querySelector('[data-gf=ideal]').focus();
    el.addEventListener('click',async function(e){
      if(e.target.closest('[data-bclose]')){closeNote();return;}
      if(!e.target.closest('[data-gsave]'))return;
      var v={};['role','ideal','income','year'].forEach(function(f){var i=el.querySelector('[data-gf='+f+']');if(i)v[f]=i.value.trim();});
      if(v.year&&!/^\d{4}$/.test(v.year)){el.querySelector('.bnote-err').textContent='達成する年は西暦4桁で入力してください';return;}
      if(v.income==='')v.income=null;
      try{await saveGoal(id,v);closeNote();setStatus('目標を保存しました');await load();}catch(x){fail(x);}
    });
  }
  function openNode(pid,nid,anchor){
    closeNote();
    var g=goalOf(gsel), tree=JSON.parse(JSON.stringify(g.tree||[])), f=nid?gnFind(tree,nid,null):null, n=f?f.n:{t:'',co:'',line:'',g:''};
    var coOpts='<option value="">つなげない</option><option value="*|">グループ全体</option>'+budgets.map(function(b){return '<optgroup label="'+esc(b.name)+'"><option value="'+esc(b.id)+'|">'+esc(b.name)+'（会社全体）</option>'+b.lines.map(function(l){return '<option value="'+esc(b.id+'|'+l.id)+'">'+(l.k==='exp'?'［支出］':'［売上］')+esc(l.n)+'</option>';}).join('')+'</optgroup>';}).join('');
    var gOpts='<option value="">つなげない</option>'+sortedGroups().map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('');
    var parent=pid?gnFind(tree,pid,null):null;
    var el=document.createElement('div'); el.className='bnote'; el.setAttribute('role','dialog');
    el.innerHTML='<div class="bnote-h"><b>'+(nid?'枝を修正':'枝を追加')+'</b><span>'+esc(parent?'「'+parent.n.t+'」の下':gsel+'の理想の下')+'</span><button type="button" class="bx" data-bclose aria-label="閉じる">×</button></div>'
      +'<label>やること・目標<textarea data-gf="t" rows="2" maxlength="200" placeholder="例：病院コンサルを3件に増やす"></textarea></label>'
      +'<label>ゴール（数字・状態で具体的に）<textarea data-gf="goal" rows="2" maxlength="300" placeholder="例：2027年7月までに2件目の契約（月40万円）"></textarea></label>'
      +'<div class="bnote-r"><label>期限<input data-gf="due" type="month"></label><label class="bchk" style="margin-top:22px"><input data-gf="done" type="checkbox"> 完了</label></div>'
      +'<label>説明・理由（任意）<textarea data-gf="note" rows="3" maxlength="1500"></textarea></label>'
      +'<label>予実とつなぐ（数字を自動で表示）<select data-gf="co">'+coOpts+'</select></label>'
      +'<label>TODOとつなぐ（進み具合を表示）<select data-gf="g">'+gOpts+'</select></label>'
      +'<p class="bnote-err" aria-live="polite"></p><div class="bnote-b">'+(nid?'<button type="button" class="btn danger" data-gdel>削除</button>':'<span></span>')+'<span><button type="button" class="btn" data-bclose>やめる</button> <button type="button" class="btn primary" data-gsave>保存</button></span></div>';
    el.querySelector('[data-gf=t]').value=n.t||''; el.querySelector('[data-gf=co]').value=n.co?n.co+'|'+(n.line||''):''; el.querySelector('[data-gf=g]').value=n.g||'';el.querySelector('[data-gf=goal]').value=n.goal||'';el.querySelector('[data-gf=due]').value=n.due||'';el.querySelector('[data-gf=note]').value=n.note||'';el.querySelector('[data-gf=done]').checked=!!n.done;
    placeNote(el,anchor); note={el:el}; el.querySelector('[data-gf=t]').focus();
    el.addEventListener('click',async function(e){
      if(e.target.closest('[data-bclose]')){closeNote();return;}
      var del=e.target.closest('[data-gdel]'), save=e.target.closest('[data-gsave]'); if(!del&&!save)return;
      if(del){if(del.dataset.armed!=='1'){del.dataset.armed='1';del.textContent=(f.n.kids&&f.n.kids.length?'下の枝ごと削除':'本当に削除');return;}f.arr.splice(f.i,1);}
      else{var t=el.querySelector('[data-gf=t]').value.trim();if(!t){el.querySelector('.bnote-err').textContent='やること・目標を入力してください';return;}
        var cv=el.querySelector('[data-gf=co]').value.split('|'),v={t:t,co:cv[0]||'',line:cv[1]||'',g:el.querySelector('[data-gf=g]').value,goal:el.querySelector('[data-gf=goal]').value.trim(),due:el.querySelector('[data-gf=due]').value,note:el.querySelector('[data-gf=note]').value.trim(),done:el.querySelector('[data-gf=done]').checked};
        if(f)Object.assign(f.n,v);else{v.id='gn'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);v.kids=[];if(parent){parent.n.kids=parent.n.kids||[];parent.n.kids.push(v);}else tree.push(v);}}
      try{await saveGoal(gsel,{tree:tree});closeNote();setStatus('目標を保存しました');await load();}catch(x){fail(x);}
    });
  }
  function rProfit(){
    var gs=sortedGroups(), cnt={none:0,prep:0,revenue:0,profit:0};
    gs.forEach(function(g){if(g.goal)cnt[g.status||'none']++;});
    var html=rBudget()+'<div class="psum">'+Object.keys(STATUS).map(function(k){return '<div><b>'+cnt[k]+'</b>'+STATUS[k]+'</div>';}).join('')+'</div><div class="pgrid">';
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
  async function load(){var d=await api('GET','/api/data');var g={};d.groups.forEach(function(x){g[x.id]=x;});var t={};d.tasks.forEach(function(x){x.done=!!x.done;t[x.id]=x;});var n={};(d.notes||[]).forEach(function(x){(n[x.task_id]=n[x.task_id]||[]).push(x);});groups=g;tasks=t;notes=n;actuals={};(d.actuals||[]).forEach(function(a){actuals[a.company+'|'+a.ym]=a;});goals={};(d.goals||[]).forEach(function(x){try{x.tree=JSON.parse(x.tree||'[]');}catch(e){x.tree=[];}goals[x.id]=x;});budgets=(d.budgets||[]).map(function(b){try{b.lines=JSON.parse(b.lines||'[]');}catch(e){b.lines=[];}return b;});canWrite=true;if(view()!=='log'||!document.getElementById('allLog'))render();}
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
  app.addEventListener('click',function(e){
    var gs=e.target.closest('[data-gsel]');if(gs){gsel=gs.dataset.gsel;try{localStorage.setItem('todo-gsel',gsel);}catch(x){}render();return;}
    if(e.target.closest('[data-gedit]')){gEdit=!gEdit;render();return;}
    var gpz=e.target.closest('[data-gperson]');if(gpz&&canWrite){e.preventDefault();openPerson(gpz.dataset.gperson,gpz);return;}
    var gdl=e.target.closest('[data-gndel]');if(gdl&&canWrite){e.preventDefault();
      if(gdl.dataset.armed!=='1'){document.querySelectorAll('[data-gndel][data-armed]').forEach(function(x){x.dataset.armed='';x.textContent='削除';});gdl.dataset.armed='1';gdl.textContent='もう一度押すと削除';return;}
      var tr=JSON.parse(JSON.stringify(goalOf(gsel).tree||[])),fd=gnFind(tr,gdl.dataset.gndel,null);if(fd){fd.arr.splice(fd.i,1);saveGoal(gsel,{tree:tr}).then(function(){setStatus('削除しました');return load();}).catch(fail);}return;}
    var gna=e.target.closest('[data-gnadd]');if(gna&&canWrite){e.preventDefault();openNode(gna.dataset.gnadd,null,gna);return;}
    var gnn=e.target.closest('[data-gn]');if(gnn&&canWrite){e.preventDefault();openNode(null,gnn.dataset.gn,gnn);return;}
    var sb=e.target.closest('[data-bsel]');if(sb){bsel=sb.dataset.bsel;try{localStorage.setItem('todo-bsel',bsel);}catch(x){}render();return;}
    var bi=e.target.closest('[data-binfo]');if(bi){e.preventDefault();var L=findLine(bi.dataset.binfo,bi.dataset.line);if(!L)return;closeNote();var el=document.createElement('div');el.className='bnote binfo-pop';el.setAttribute('role','dialog');
      el.innerHTML='<div class="bnote-h"><b>'+esc(L.n)+'</b><button type="button" class="bx" data-bclose aria-label="閉じる">×</button></div><p>'+esc(bi.closest('td').querySelector('small').getAttribute('title'))+'</p>';
      document.body.appendChild(el);var r=bi.getBoundingClientRect(),w=Math.min(360,window.innerWidth-24);el.style.width=w+'px';el.style.left=Math.min(r.left,window.innerWidth-w-12)+'px';var top=r.bottom+6;if(top+el.offsetHeight>window.innerHeight-12)top=Math.max(12,r.top-el.offsetHeight-6);el.style.top=top+'px';note={el:el};
      el.addEventListener('click',function(ev){if(ev.target.closest('[data-bclose]'))closeNote();});el.addEventListener('keydown',function(ev){if(ev.key==='Escape')closeNote();});el.querySelector('.bx').focus();return;}
    var yc=e.target.closest('[data-yj]');if(yc&&canWrite){e.preventDefault();openActual(yc.dataset.yj,yc.dataset.ym,yc);return;}
    var t=e.target.closest('[data-badd],[data-bed],[data-bcp]'); if(!t||!canWrite)return;
    e.preventDefault();
    if(t.dataset.badd)openNote(t.dataset.badd,null,'new',t);
    else if(t.dataset.bed)openNote(t.dataset.bed,findLine(t.dataset.bed,t.dataset.line),'edit',t);
    else openNote(t.dataset.bcp,findLine(t.dataset.bcp,t.dataset.line),'copy',t);
  });
  app.addEventListener('toggle',function(e){var d=e.target;if(d.dataset&&d.dataset.bco)budOpen[d.dataset.bco]=d.open;},true);
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
  function showLogin(msg){document.getElementById('chg').hidden=true;document.getElementById('login').hidden=false;document.getElementById('l_err').textContent=msg||'';if(!msg)document.getElementById('l_name').value='';document.getElementById('l_pass').value='';groups={};tasks={};notes={};budgets=[];goals={};canWrite=false;app.innerHTML='';ME=TOKEN?ME:'';showMe();}
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
