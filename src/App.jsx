import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Sun, Flame, CalendarDays, Users, LogOut, Check, Sparkles, ShieldCheck, ArrowUpRight } from 'lucide-react';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = URL && KEY ? createClient(URL, KEY) : null;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmt = (key) => new Date(`${key}T12:00:00`).toLocaleDateString('pt-BR', {day:'2-digit', month:'short'});
const streakFor = (days) => {
  const set = new Set(days);
  let cursor = new Date(`${todayKey()}T12:00:00`);
  if (!set.has(todayKey())) cursor.setDate(cursor.getDate()-1);
  let n = 0;
  while (set.has(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`)) {
    n++; cursor.setDate(cursor.getDate()-1);
  }
  return n;
};
const initials = (s='?') => s.slice(0,1).toUpperCase();

export default function App() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [profiles,setProfiles] = useState([]);
  const [myDays,setMyDays] = useState([]);
  const [allDays,setAllDays] = useState({});
  const [nickname,setNickname] = useState('');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [authMode,setAuthMode] = useState('signup');
  const [recoveryMode,setRecoveryMode] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [tab,setTab] = useState('inicio');
  const [configured,setConfigured] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((event,s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => subscription.unsubscribe();
  },[]);

  async function loadData(userId) {
    const [{data:mine},{data:people},{data:logs}] = await Promise.all([
      supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
      supabase.from('profiles').select('id,nickname,created_at'),
      supabase.from('checkins').select('user_id,checkin_date').order('checkin_date',{ascending:false})
    ]);
    setProfile(mine);
    setProfiles(people || []);
    const grouped = {};
    (logs || []).forEach(x => { (grouped[x.user_id] ||= []).push(x.checkin_date); });
    setAllDays(grouped);
    setMyDays(grouped[userId] || []);
  }

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const {data: existing} = await supabase.from('profiles').select('id').eq('id',session.user.id).maybeSingle();
      const savedNickname = session.user.user_metadata?.nickname;
      if (!existing && savedNickname) {
        const {error:profileError} = await supabase.from('profiles').insert({id:session.user.id,nickname:savedNickname});
        if (profileError && profileError.code !== '23505') setError('Sua conta entrou, mas não foi possível criar o perfil: ' + profileError.message);
        if (profileError?.code === '23505') setError('Esse nickname já está em uso. Entre em contato para recuperar o perfil ou escolha outro no cadastro.');
      }
      await loadData(session.user.id);
    })();
  },[session]);

  async function enter() {
    const clean = nickname.trim().replace(/^@/,'');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.split('@')[1]?.includes('.')) {
      setError('Digite um e-mail válido.'); return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.'); return;
    }
    if (authMode === 'signup' && (!clean || clean.length < 3 || clean.length > 18 || !/^[a-zA-Z0-9_.-]+$/.test(clean))) {
      setError('Use um nickname de 3 a 18 caracteres: letras, números, ponto, hífen ou underline.'); return;
    }
    setBusy(true); setError('');
    try {
      if (authMode === 'signup') {
        const {data:reserved,error:lookupError} = await supabase.from('profiles').select('id').eq('nickname',clean).maybeSingle();
        if (lookupError) throw lookupError;
        if (reserved) throw new Error('Esse nickname já está cadastrado. Escolha outro para criar uma conta nova.');
        const {data,error:authError} = await supabase.auth.signUp({
          email:cleanEmail,
          password,
          options:{data:{nickname:clean}}
        });
        if (authError) throw authError;
        if (data.session) {
          setSession(data.session);
          setError('');
        } else {
          setError('Sua conta foi criada, mas o acesso automático não foi iniciado. Tente entrar com seu e-mail e senha.');
        }
      } else {
        const {data,error:authError} = await supabase.auth.signInWithPassword({email:cleanEmail,password});
        if (authError) throw authError;
        setSession(data.session);
      }
    } catch(e) {
      const message = e.message || 'Não foi possível concluir o acesso.';
      setError(message.includes('duplicate key') || message.includes('already registered') ? 'Este e-mail já possui cadastro. Selecione “Já tenho conta” para entrar.' : message);
    } finally { setBusy(false); }
  }

  async function updatePassword() {
    if (password.length < 8) { setError('A senha precisa ter pelo menos 8 caracteres.'); return; }
    setBusy(true); setError('');
    const {error:e} = await supabase.auth.updateUser({password});
    setBusy(false);
    if (e) setError(e.message);
    else { setRecoveryMode(false); setAuthMode('login'); setPassword(''); setError('Senha atualizada. Entre com sua nova senha.'); await supabase.auth.signOut(); }
  }

  async function recoverPassword() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError('Digite seu e-mail para receber o link de recuperação.'); return; }
    setBusy(true); setError('');
    const {error:e} = await supabase.auth.resetPasswordForEmail(cleanEmail,{redirectTo:window.location.origin});
    setError(e ? e.message : 'Se houver uma conta para este e-mail, você receberá um link para redefinir a senha.');
    setBusy(false);
  }

  async function checkIn() {
    if (!session || myDays.includes(todayKey())) return;
    setBusy(true); setError('');
    const {error:e} = await supabase.from('checkins').insert({user_id:session.user.id,checkin_date:todayKey()});
    if (e) setError(e.message);
    else await loadData(session.user.id);
    setBusy(false);
  }

  async function leave() {
    await supabase.auth.signOut();
    setProfile(null); setMyDays([]); setError('');
  }

  const myStreak = streakFor(myDays);
  const didToday = myDays.includes(todayKey());
  const sorted = useMemo(() => profiles.map(p => ({...p, days:allDays[p.id] || [], streak:streakFor(allDays[p.id] || [])}))
    .sort((a,b) => b.streak-a.streak || b.days.length-a.days.length || a.nickname.localeCompare(b.nickname)),[profiles,allDays]);
  const monthCells = useMemo(() => {
    const now = new Date(), y=now.getFullYear(), m=now.getMonth();
    const first = new Date(y,m,1).getDay(), count = new Date(y,m+1,0).getDate();
    return [...Array(first).fill(null), ...Array.from({length:count},(_,i)=>`${y}-${String(m+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)];
  },[myDays]);

  if (!configured) return <main className="setup"><div className="setup-card"><div className="sun-mark"><Sun/></div><p className="eyebrow">PRIMEIRO PASSO</p><h1>Vamos colocar o Solstreak no ar.</h1><p>O site está pronto, mas precisa ser conectado a um projeto Supabase para guardar os perfis e registros de toda a comunidade.</p><ol><li>Crie um projeto gratuito no Supabase.</li><li>Execute o arquivo <code>supabase/schema.sql</code> no SQL Editor.</li><li>Copie a URL e a chave anon para um arquivo <code>.env</code>, seguindo o <code>.env.example</code>.</li><li>Consulte o README para publicar na Vercel.</li></ol><p className="small">Não publique chaves secretas (service_role). A chave anon é própria para uso no navegador, com as políticas RLS deste projeto.</p></div></main>;

  if (!session) return <main className="login-wrap"><div className="login-card"><div className="brand"><span className="brand-icon"><Sun size={22}/></span><span>solstreak</span></div><div className="hero-sun">☀️</div><p className="eyebrow">UMA CHAMA POR DIA</p><h1>{recoveryMode?'Crie uma nova senha.':<>Seu cuidado também<br/>pode virar hábito.</>}</h1><p className="muted">{recoveryMode?'Escolha uma senha com pelo menos 8 caracteres.':'Registre seu protetor solar, mantenha sua chama acesa e acompanhe a comunidade.'}</p>{!recoveryMode&&<div className="auth-switch"><button className={authMode==='signup'?'selected':''} onClick={()=>{setAuthMode('signup');setError('');}}>Criar conta</button><button className={authMode==='login'?'selected':''} onClick={()=>{setAuthMode('login');setError('');}}>Já tenho conta</button></div>}{!recoveryMode&&authMode==='signup'&&<><label htmlFor="nick">Escolha seu nickname</label><div className="nick-input"><span>@</span><input id="nick" value={nickname} maxLength={18} placeholder="seunome" onChange={e=>setNickname(e.target.value)}/></div></>}{!recoveryMode&&<><label htmlFor="email">E-mail</label><input className="auth-input" id="email" type="email" autoComplete="email" value={email} placeholder="voce@exemplo.com" onChange={e=>setEmail(e.target.value)}/></>}<label htmlFor="password">Senha</label><input className="auth-input" id="password" type="password" autoComplete={recoveryMode?'new-password':authMode==='signup'?'new-password':'current-password'} value={password} placeholder="Pelo menos 8 caracteres" onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(recoveryMode?updatePassword():enter())}/><button className="primary full" onClick={recoveryMode?updatePassword:enter} disabled={busy}>{busy?'Aguarde…':recoveryMode?'Salvar nova senha':authMode==='signup'?'Criar minha conta':'Entrar'} <ArrowUpRight size={17}/></button>{!recoveryMode&&authMode==='login'&&<button className="text-action" onClick={recoverPassword} disabled={busy}>Esqueci minha senha</button>}{error&&<p className="error">{error}</p>}<p className="small center">Seu nickname e seus registros serão públicos. Seu e-mail e sua senha não serão exibidos.</p></div></main>;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-icon"><Sun size={22}/></span><span>solstreak</span></div><div className="top-user"><span className="avatar">{initials(profile?.nickname)}</span><b>@{profile?.nickname || 'perfil'}</b><button className="icon-btn" title="Sair" onClick={leave}><LogOut size={17}/></button></div></header>
    <main className="content">
      <div className="welcome"><div><p className="eyebrow">SEU CANTINHO DE SOL</p><h1>Oi, @{profile?.nickname}! <span>☀️</span></h1><p className="muted">Um pequeno cuidado, um dia de cada vez.</p></div><div className="date-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'})}</div></div>
      <section className="streak-card"><div className="streak-copy"><span className="streak-label"><Flame size={17}/> SUA OFENSIVA</span><div className="streak-number">{myStreak}<small> {myStreak===1?'dia':'dias'}</small></div><p>{myStreak ? 'Sua chama está acesa. Continue no seu ritmo!' : 'Hoje pode ser o começo de uma nova sequência.'}</p></div><div className="flame-art">🔥</div><div className="streak-bottom"><span>☀️ {myDays.length} dias registrados no total</span><span>{myStreak>=7?'Uma semana de cuidado!':'Cada registro conta.'}</span></div></section>
      <section className="check-card"><div className="check-icon"><ShieldCheck size={23}/></div><div className="check-text"><h2>{didToday?'Registro de hoje feito!':'Você usou protetor hoje?'}</h2><p>{didToday?'Seu dia já está registrado. Até amanhã!':'Marque quando tiver usado protetor solar hoje.'}</p></div><button className={didToday?'done':'primary'} onClick={checkIn} disabled={busy||didToday}>{didToday?<><Check size={17}/> Registrado</>:busy?'Salvando…':'Usei hoje!'}</button></section>
      <nav className="tabs"><button className={tab==='inicio'?'active':''} onClick={()=>setTab('inicio')}><Sun size={16}/> Meu progresso</button><button className={tab==='ranking'?'active':''} onClick={()=>setTab('ranking')}><Users size={16}/> Comunidade</button></nav>
      {tab==='inicio' ? <div className="grid-main"><section className="panel calendar-panel"><div className="panel-heading"><div><p className="eyebrow">SEU HISTÓRICO</p><h2>Calendário de proteção</h2></div><span className="month-label">{new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span></div><div className="calendar">{['D','S','T','Q','Q','S','S'].map((d,i)=><span className="weekday" key={i}>{d}</span>)}{monthCells.map((day,i)=><span key={i} className={`day ${day&&myDays.includes(day)?'marked':''} ${day===todayKey()?'today':''}`}>{day?Number(day.slice(-2)):''}</span>)}</div><p className="legend"><i/> Dia com registro</p></section><section className="panel stats-panel"><p className="eyebrow">SEUS NÚMEROS</p><h2>Passo a passo</h2><div className="stat"><span>🔥</span><div><b>{myStreak} dias</b><small>Ofensiva atual</small></div></div><div className="stat"><span>☀️</span><div><b>{myDays.length} dias</b><small>Registros no total</small></div></div><div className="stat"><span>🏆</span><div><b>{myDays.filter(d=>d.startsWith(todayKey().slice(0,7))).length?Math.round(myDays.filter(d=>d.startsWith(todayKey().slice(0,7))).length/Number(todayKey().slice(-2))*100):0}%</b><small>Regularidade dos dias registrados</small></div></div></section></div>
      : <section className="panel leaderboard"><div className="panel-heading"><div><p className="eyebrow">TODO MUNDO NO MESMO SOL</p><h2>Ranking da comunidade</h2></div><span className="people-count"><Users size={15}/>{profiles.length} pessoas</span></div><p className="muted">Ordenado pela ofensiva atual. O histórico acumulado continua salvo.</p>{sorted.map((p,i)=><div className="rank-row" key={p.id}><span className={`rank-pos pos-${i+1}`}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span><span className="avatar">{initials(p.nickname)}</span><div className="rank-name"><b>@{p.nickname}</b><small>{p.days.length} dias registrados no total</small></div><strong><Flame size={17}/>{p.streak}</strong></div>)}</section>}
      <footer><span><Sun size={14}/> Solstreak</span><span>Pequenos cuidados, grandes constâncias.</span></footer>
      {error&&<div className="toast">{error}</div>}
    </main>
  </div>;
}