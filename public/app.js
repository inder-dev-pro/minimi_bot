const chat = document.querySelector('#chat'), form = document.querySelector('#composer'), input = document.querySelector('#input');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const storedId = localStorage.getItem('minimi-conversation');
let conversationId = storedId && UUID_RE.test(storedId) ? storedId : null;
if (storedId && !conversationId) localStorage.removeItem('minimi-conversation');

const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
const hostOf = u => { try { return new URL(u).hostname; } catch { return ''; } };

const hasMarked = typeof marked !== 'undefined';
if (hasMarked) {
  marked.use({
    breaks: true,
    gfm: true,
    renderer: {
      html({ text }) { return escape(text); }
    }
  });
}
function renderMarkdown(text) {
  if (!text) return '';
  if (hasMarked) {
    return marked.parse(text).replace(/href\s*=\s*["']\s*(?:javascript|data):[^"']*["']/gi, 'href="#"');
  }
  return escape(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z');
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleDateString();
}

function scroll(){ window.scrollTo({top:document.body.scrollHeight, behavior:'smooth'}); }
function add(role, text=''){
  const el = document.createElement('article');
  el.className = `message ${role}`;
  if (role === 'assistant' && text) { el.innerHTML = renderMarkdown(text); }
  else { el.textContent = text; }
  chat.append(el); scroll(); return el;
}
function sources(items){
  if(!items?.length) return;
  const box = document.createElement('div');
  box.className = 'source-list';
  box.innerHTML = items.map((s, i) => `<a target="_blank" rel="noreferrer" href="${escape(safeUrl(s.url))}">[${i+1}] ${escape(s.title)}<small>${escape(s.publishedAt || hostOf(s.url))}</small></a>`).join('');
  chat.append(box);
}

async function ask(message){
  add('user', message);
  const answer = add('assistant', '');
  let rawText = '';
  const state = document.createElement('div');
  state.className = 'status';
  state.textContent = 'Starting agent';
  chat.append(state);
  input.disabled = true;
  form.querySelector('button').disabled = true;
  try{
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, conversationId }) });
    if(!r.ok) throw Error((await r.json()).error || 'Request failed');
    const reader = r.body.getReader(), decoder = new TextDecoder();
    let buffer = '';
    while(true){
      const { value, done } = await reader.read();
      if(done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop();
      for(const chunk of chunks){
        let ev = 'message', data = '';
        for(const l of chunk.split('\n')){ if(l.startsWith('event:')) ev = l.slice(6).trim(); if(l.startsWith('data:')) data += l.slice(5).trim(); }
        if(!data) continue;
        const payload = JSON.parse(data);
        if(ev === 'token'){ rawText += payload; answer.innerHTML = renderMarkdown(rawText); scroll(); }
        else if(ev === 'status') state.textContent = payload.label;
        else if(ev === 'done'){ conversationId = payload.conversationId; localStorage.setItem('minimi-conversation', conversationId); sources(payload.sources); state.remove(); }
        else if(ev === 'error') throw Error(payload.message);
      }
    }
  }catch(e){ answer.textContent = `Sorry — ${e.message}`; state.remove(); }
  finally{ input.disabled = false; form.querySelector('button').disabled = false; input.focus(); }
}

form.addEventListener('submit', e => { e.preventDefault(); const m = input.value.trim(); if(!m) return; input.value = ''; ask(m); });
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 140)}px`; });
document.querySelectorAll('.examples button').forEach(b => b.onclick = () => { input.value = b.textContent; form.requestSubmit(); });
document.querySelector('#newChat').onclick = () => { conversationId = null; localStorage.removeItem('minimi-conversation'); location.reload(); };
const diagram = document.querySelector('#diagram');
document.querySelector('#architecture').onclick = () => { diagram.style.display = 'block'; diagram.setAttribute('aria-hidden', 'false'); };
document.querySelector('#close').onclick = () => { diagram.style.display = 'none'; diagram.setAttribute('aria-hidden', 'true'); };

async function loadConversation(id) {
  const r = await fetch(`/api/conversations/${encodeURIComponent(id)}`);
  if (!r.ok) return false;
  const { messages } = await r.json();
  if (!messages?.length) return false;
  const welcome = document.querySelector('.welcome');
  if (welcome) welcome.style.display = 'none';
  chat.querySelectorAll('.message, .source-list').forEach(el => el.remove());
  messages.forEach(m => {
    add(m.role, m.content);
    if (m.role === 'assistant' && m.sources?.length) sources(m.sources);
  });
  return true;
}

// Load existing conversations from seed data and show them
async function loadDemoConversations() {
  try {
    const res = await fetch('/api/conversations');
    if (!res.ok) return;
    const { conversations } = await res.json();
    if (!conversations?.length) return;
    const list = document.querySelector('#demo-conversations');
    if (!list) return;
    list.innerHTML = conversations.map(c =>
      `<button class="demo-conv" data-id="${escape(c.id)}"><span>${escape(c.preview || 'Conversation')}</span><small>${escape(formatDate(c.createdAt))}</small></button>`
    ).join('');
    list.style.display = 'flex';
    list.querySelectorAll('.demo-conv').forEach(btn => {
      btn.onclick = async () => {
        conversationId = btn.dataset.id;
        localStorage.setItem('minimi-conversation', conversationId);
        await loadConversation(conversationId);
      };
    });
  } catch (e) { /* silently skip */ }
}

// Check API status and show banner if keys are missing
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return;
    const health = await res.json();
    const banner = document.querySelector('#api-banner');
    if (!banner) return;
    const warnings = [];
    if (!health.llm) warnings.push('GROQ_API_KEY not set — new chat will not work');
    if (!health.search) warnings.push('TAVILY_API_KEY not set — web search disabled');
    if (warnings.length) {
      banner.textContent = '⚠ ' + warnings.join(' · ') + ' — browse demo conversations below';
      banner.style.display = 'block';
    }
  } catch (e) { /* ignore */ }
}

checkHealth();
loadDemoConversations();
if (conversationId) {
  loadConversation(conversationId).then(found => {
    if (!found) {
      conversationId = null;
      localStorage.removeItem('minimi-conversation');
    }
  }).catch(() => {});
}
