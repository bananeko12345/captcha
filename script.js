const widget = document.getElementById('captcha');
const image = document.getElementById('captcha-image');
const imageLoading = document.getElementById('image-loading');
const answerInput = document.getElementById('captcha-answer');
const btnVerify = document.getElementById('btn-verify');
const btnRefresh = document.getElementById('btn-refresh');
const modalMsg = document.getElementById('modal-msg');
const successRow = document.getElementById('success-row');
const btnSubmit = document.getElementById('btn-submit');
const formMsg = document.getElementById('form-msg');
const form = document.getElementById('demo-form');
let challengeId = null;
let state = 'idle';

function setMessage(text, kind = '') { modalMsg.textContent = text; modalMsg.className = `modal-msg ${kind}`; }

async function newChallenge() {
  state = 'loading'; btnRefresh.disabled = true; btnVerify.disabled = true; answerInput.disabled = true;
  image.removeAttribute('src'); imageLoading.hidden = false; setMessage('画像を準備中…');
  try {
    const response = await fetch('/api/captcha/challenge', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('challenge request failed');
    const data = await response.json();
    challengeId = data.id;
    image.onload = () => { imageLoading.hidden = true; };
    image.onerror = () => { imageLoading.textContent = '画像を表示できません。更新してください。'; imageLoading.hidden = false; };
    image.src = `${data.imageUrl}?v=${Date.now()}`;
    answerInput.value = ''; answerInput.disabled = false; btnVerify.disabled = false; state = 'challenge'; setMessage(''); answerInput.focus();
  } catch { setMessage('画像を取得できませんでした。もう一度更新してください。', 'error'); state = 'idle'; }
  finally { btnRefresh.disabled = false; }
}

btnRefresh.addEventListener('click', newChallenge);
answerInput.addEventListener('input', () => { answerInput.value = answerInput.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6); });
answerInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); btnVerify.click(); } });
btnVerify.addEventListener('click', async () => {
  if (!challengeId || !answerInput.value.trim()) { setMessage('画像の文字を入力してください。', 'error'); return; }
  btnVerify.disabled = true; answerInput.disabled = true; setMessage('確認中…');
  try {
    const response = await fetch('/api/captcha/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: challengeId, answer: answerInput.value }), cache: 'no-store' });
    const data = await response.json();
    if (!data.ok) { setMessage(data.message || '確認できませんでした。', 'error'); answerInput.disabled = false; if (response.status === 429) await newChallenge(); return; }
    state = 'verified'; widget.classList.add('verified'); successRow.hidden = false; btnSubmit.disabled = false; setMessage('認証に成功しました。', 'success');
  } catch { setMessage('通信エラーです。もう一度お試しください。', 'error'); }
  finally { if (state !== 'verified') btnVerify.disabled = false; }
});

form.addEventListener('submit', (event) => { event.preventDefault(); if (state === 'verified') formMsg.textContent = '送信成功！（デモなので実際には送信されていません）'; });
newChallenge();
