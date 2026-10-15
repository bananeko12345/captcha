// ============================================================
// FAKE CAPTCHA — reCAPTCHA v2 っぽいやつの自前実装 (学習用デモ)
// ============================================================

const widget      = document.getElementById('captcha');
const box         = document.getElementById('captcha-box');
const boxInner    = document.getElementById('box-inner');
const label       = document.getElementById('captcha-label');
const modal       = document.getElementById('captcha-modal');
const grid        = document.getElementById('img-grid');
const btnVerify   = document.getElementById('btn-verify');
const btnRefresh  = document.getElementById('btn-refresh');
const modalMsg    = document.getElementById('modal-msg');
const modalInner  = modal.querySelector('.modal-inner');
const btnSubmit   = document.getElementById('btn-submit');
const formMsg     = document.getElementById('form-msg');
const form        = document.getElementById('demo-form');

const IMAGE_CHALLENGE_RATE = 0.4;  // チェックボックス押したとき画像テストが出る確率
const SPINNER_MIN = 1500;          // 判定演出の最短(ms)
const SPINNER_MAX = 3500;          // 判定演出の最長(ms)

let state = 'idle';   // idle | loading | challenge | verified
let answerSet = new Set();

/* ---------- チェックボックスクリック → スピナー演出 ---------- */
function onBoxActivate() {
  if (state !== 'idle') return;
  state = 'loading';
  boxInner.innerHTML = '<div class="spinner"></div>';
  label.textContent = '確認中...';

  const wait = SPINNER_MIN + Math.random() * (SPINNER_MAX - SPINNER_MIN);

  setTimeout(() => {
    if (Math.random() < IMAGE_CHALLENGE_RATE) {
      openChallenge();
    } else {
      pass();
    }
  }, wait);
}

box.addEventListener('click', onBoxActivate);
box.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onBoxActivate(); }
});

/* ---------- 画像選択テスト ---------- */
function buildChallenge() {
  // 9マス: 丸画像を3〜5枚混ぜる
  const targetCount = 3 + Math.floor(Math.random() * 3); // 3〜5
  const cPool = shuffle([1, 2, 3, 4, 5, 6]).slice(0, targetCount);
  const oPool = shuffle([1, 2, 3, 4, 5, 6]);
  const tiles = [];

  cPool.forEach(n => tiles.push({ src: `images/c${n}.png`, isCircle: true }));
  while (tiles.length < 9) tiles.push({ src: `images/o${oPool.pop()}.png`, isCircle: false });
  shuffle(tiles);

  answerSet = new Set();
  grid.innerHTML = '';
  modalMsg.textContent = '';

  tiles.forEach((t, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.circle = t.isCircle;
    btn.innerHTML = `<img src="${t.src}" alt="captcha image ${i + 1}">`;
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      if (answerSet.has(i)) answerSet.delete(i); else answerSet.add(i);
    });
    grid.appendChild(btn);
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function openChallenge() {
  state = 'challenge';
  buildChallenge();
  modal.hidden = false;
}

btnRefresh.addEventListener('click', () => {
  buildChallenge();
});

btnVerify.addEventListener('click', () => {
  const tiles = [...grid.children];
  const selected = tiles
    .map((t, i) => t.classList.contains('selected') ? i : -1)
    .filter(i => i >= 0);

  const correct = tiles.every((t, i) =>
    t.dataset.circle === 'true' ? selected.includes(i) : !selected.includes(i)
  );

  if (correct) {
    modal.hidden = true;
    pass();
  } else {
    // 外れ: 間違いタイルを赤くしてシェイク、1秒後に出し直し
    modalMsg.textContent = '間違っています。もう一度確認してください。';
    tiles.forEach((t, i) => {
      const shouldSelect = t.dataset.circle === 'true';
      if (shouldSelect !== selected.includes(i)) t.classList.add('wrong');
    });
    modalInner.classList.add('shake');
    setTimeout(() => {
      modalInner.classList.remove('shake');
      buildChallenge();
    }, 1000);
  }
});

/* ---------- 合格処理 ---------- */
function pass() {
  state = 'verified';
  widget.classList.add('verified');
  box.style.borderColor = '#1ea446';
  boxInner.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22">
      <path class="checkmark" d="M4 12.5 L10 18.5 L20 6.5"/>
    </svg>`;
  boxInner.setAttribute('aria-checked', 'true');
  label.textContent = '確認しました';
  btnSubmit.disabled = false;
}

/* ---------- フォーム送信 ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (state !== 'verified') return;
  formMsg.textContent = '✅ 送信成功!(デモなので実際には送信されてません)';
});
