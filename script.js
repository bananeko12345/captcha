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
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
let challengeId = null;
let localAnswer = null;
let state = 'idle';
let imageUrl = null;

function setMessage(text, kind = '') { modalMsg.textContent = text; modalMsg.className = `modal-msg ${kind}`; }
function randomText(length = 6) { return Array.from(crypto.getRandomValues(new Uint8Array(length)), b => ALPHABET[b % ALPHABET.length]).join(''); }
function localCaptchaSvg(text) {
  const lines = Array.from({length:14}, (_, i) => `<path d="M${(i*41)%320} ${12+(i*29)%78} Q${((i*41)%320+(20+(i*67)%300))/2} ${100-(12+(i*29)%78)} ${20+(i*67)%300} ${8+(i*47)%95}"/>`).join('');
  const dots = Array.from({length:70}, (_, i) => `<circle cx="${(i*47)%320}" cy="${(i*31)%110}" r="${i%3===0?1.6:1}"/>`).join('');
  const chars = [...text].map((char, i) => { const x=37+i*43, y=76+(i%2?-4:3), r=(i%3-1)*11; return `<text x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})">${char}</text>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 320 110"><rect width="320" height="110" rx="8" fill="#102b2a"/><g fill="#70e2bd" opacity=".38">${dots}</g><g fill="none" stroke="#63d8bb" stroke-width="1.7" opacity=".55">${lines}</g><g fill="#e8fff8" font-family="Arial,sans-serif" font-size="44" font-weight="700" letter-spacing="2">${chars}</g></svg>`;
}
function showImage(src) {
  image.onload = () => { imageLoading.hidden = true; };
  image.onerror = () => { imageLoading.textContent = '画像を表示できません。更新してください。'; imageLoading.hidden = false; };
  image.src = src;
}
function useStaticFallback() {
  localAnswer = randomText();
  challengeId = `static-${Date.now()}`;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(new Blob([localCaptchaSvg(localAnswer)], { type: 'image/svg+xml' }));
  showImage(imageUrl);
  answerInput.value = '';
  answerInput.disabled = false;
  btnVerify.disabled = false;
  state = 'challenge';
  setMessage('');
  answerInput.focus();
}

async function newChallenge() {
  state = 'loading'; btnRefresh.disabled = true; btnVerify.disabled = true; answerInput.disabled = true;
  image.removeAttribute('src'); imageLoading.hidden = false; imageLoading.textContent = '画像を読み込み中…'; setMessage('');
  try {
    const response = await fetch('/api/captcha/challenge', { method: 'POST', cache: 'no-store' });
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    challengeId = data.id; localAnswer = null;
    showImage(`${data.imageUrl}?v=${Date.now()}`);
    answerInput.value = ''; answerInput.disabled = false; btnVerify.disabled = false; state = 'challenge'; answerInput.focus();
  } catch {
    // GitHub PagesなどAPIを持たない静的ホスティング向け。Nodeサーバーでは上のAPI検証が使われます。
    useStaticFallback();
  } finally { btnRefresh.disabled = false; }
}

btnRefresh.addEventListener('click', newChallenge);
answerInput.addEventListener('input', () => { answerInput.value = answerInput.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6); });
answerInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); btnVerify.click(); } });
btnVerify.addEventListener('click', async () => {
  const answer = answerInput.value.trim().toUpperCase();
  if (!challengeId || !answer) { setMessage('画像の文字を入力してください。', 'error'); return; }
  btnVerify.disabled = true; answerInput.disabled = true; setMessage('確認中…');
  try {
    if (localAnswer) {
      await new Promise(resolve => setTimeout(resolve, 250));
      if (answer !== localAnswer) throw new Error('文字が一致しません。画像を確認してください。');
    } else {
      const response = await fetch('/api/captcha/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: challengeId, answer }), cache: 'no-store' });
      const data = await response.json();
      if (!data.ok) { setMessage(data.message || '確認できませんでした。', 'error'); answerInput.disabled = false; if (response.status === 429) await newChallenge(); return; }
    }
    state = 'verified'; widget.classList.add('verified'); successRow.hidden = false; btnSubmit.disabled = false; setMessage('認証に成功しました。', 'success');
  } catch (error) { setMessage(error.message || '確認できませんでした。', 'error'); answerInput.disabled = false; }
  finally { if (state !== 'verified') btnVerify.disabled = false; }
});
form.addEventListener('submit', (event) => { event.preventDefault(); if (state === 'verified') formMsg.textContent = '送信成功！（デモなので実際には送信されていません）'; });
newChallenge();
