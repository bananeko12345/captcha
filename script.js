const widget = document.getElementById('captcha');
const box = document.getElementById('captcha-box');
const boxInner = document.getElementById('box-inner');
const label = document.getElementById('captcha-label');
const modal = document.getElementById('captcha-modal');
const image = document.getElementById('captcha-image');
const answerInput = document.getElementById('captcha-answer');
const btnVerify = document.getElementById('btn-verify');
const btnRefresh = document.getElementById('btn-refresh');
const modalMsg = document.getElementById('modal-msg');
const btnSubmit = document.getElementById('btn-submit');
const formMsg = document.getElementById('form-msg');
const form = document.getElementById('demo-form');

let state = 'idle';
let challengeId = null;

async function newChallenge() {
  btnRefresh.disabled = true;
  modalMsg.textContent = '画像を準備中...';
  try {
    const response = await fetch('/api/captcha/challenge', { method: 'POST' });
    if (!response.ok) throw new Error('challenge request failed');
    const data = await response.json();
    challengeId = data.id;
    image.src = data.image;
    answerInput.value = '';
    modalMsg.textContent = '';
    answerInput.focus();
  } catch {
    modalMsg.textContent = '画像を取得できませんでした。もう一度お試しください。';
  } finally {
    btnRefresh.disabled = false;
  }
}

async function openChallenge() {
  state = 'challenge';
  modal.hidden = false;
  await newChallenge();
}

function onBoxActivate() {
  if (state !== 'idle') return;
  state = 'loading';
  boxInner.innerHTML = '<div class="spinner"></div>';
  label.textContent = '確認中...';
  setTimeout(openChallenge, 550);
}

box.addEventListener('click', onBoxActivate);
box.addEventListener('keydown', (event) => {
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onBoxActivate(); }
});

btnRefresh.addEventListener('click', newChallenge);
answerInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); btnVerify.click(); }
});

btnVerify.addEventListener('click', async () => {
  if (!challengeId || !answerInput.value.trim()) {
    modalMsg.textContent = '画像の文字を入力してください。';
    return;
  }
  btnVerify.disabled = true;
  modalMsg.textContent = '確認中...';
  try {
    const response = await fetch('/api/captcha/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: challengeId, answer: answerInput.value })
    });
    const data = await response.json();
    if (!data.ok) {
      modalMsg.textContent = data.message || '確認できませんでした。';
      if (response.status === 429 || response.status === 400 && data.message?.includes('期限')) await newChallenge();
      return;
    }
    modal.hidden = true;
    pass();
  } catch {
    modalMsg.textContent = '通信エラーです。もう一度お試しください。';
  } finally {
    btnVerify.disabled = false;
  }
});

function pass() {
  state = 'verified';
  widget.classList.add('verified');
  box.style.borderColor = '#1ea446';
  boxInner.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path class="checkmark" d="M4 12.5 L10 18.5 L20 6.5"/></svg>';
  box.setAttribute('aria-checked', 'true');
  label.textContent = '確認しました';
  btnSubmit.disabled = false;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (state !== 'verified') return;
  formMsg.textContent = '送信成功！（デモなので実際には送信されていません）';
});
