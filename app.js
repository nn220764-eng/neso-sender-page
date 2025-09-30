const statusEl = document.getElementById('status');
const infoEl = document.getElementById('info');
const connectBtn = document.getElementById('connectBtn');
const sendBtn = document.getElementById('sendBtn');
const addToListBtn = document.getElementById('addToListBtn');
const batchList = document.getElementById('batchList');
const singleAddressSelect = document.getElementById('singleAddressSelect');
const amountToAdd = document.getElementById('amountToAdd');

const singleAddSection = document.getElementById('singleAddSection');
const toggleSingleAddBtn = document.getElementById('toggleSingleAddBtn');

// 分配機能用
const distributeSection = document.getElementById('distributeSection');
const toggleDistributeBtn = document.getElementById('toggleDistributeBtn');
const partyMembersSelect = document.getElementById('partyMembersSelect');
const rewardTypeRadios = document.querySelectorAll('input[name="rewardType"]');
const itemDetails = document.getElementById('itemDetails');
const itemName = document.getElementById('itemName');
const itemQuantity = document.getElementById('itemQuantity');
const itemPrice = document.getElementById('itemPrice');
const nesoDetails = document.getElementById('nesoDetails');
const rewardNesoAmount = document.getElementById('rewardNesoAmount');
const applyFeeCheckbox = document.getElementById('applyFeeCheckbox');
const includeSelfCheckbox = document.getElementById('includeSelfCheckbox');
const addDistributeBtn = document.getElementById('addDistributeBtn');
const distributeMemo = document.getElementById('distributeMemo');
const clearListBtn = document.getElementById('clearListBtn');
const clearLogBtn = document.getElementById('clearLogBtn');

// --- アドレス帳 ---
// ここに名前とアドレスのリストを追加・編集してください
const ADDRESS_BOOK = [
  { name: "とずんぷ", address: "0x78B7e02A145531146Ae6F775AcC268F039c19f34" },
  { name: "げこ", address: "0xf050864d86aBEC249d0608e83c859c05922c9209" },
  { name: "tonga_ri", address: "0xE1Dc7F44706346D870824bB22779797Ff8aAd480" },
  { name: "全自動掃除機", address: "0x0d0501c4Bd4c4E6547578bBCc973789182b82996" },
  { name: "りーばん", address: "0x25916fa1ad3ACe825F71f9c78A0fE1328Cc3aBb2" },
  { name: "shikis", address: "0x032C1264B64FFb10c405862eEE61Cb4860289F03" },
  { name: "poyupuri", address: "0xaa95cF1ECA2b74De15f98Cb5408a974374B42d7B" },
  { name: "satou", address: "0xeE7670e0Eb30932868CE2013228a030D94DB949A" },
  { name: "あんめるつ", address: "0x47eF79F9d201b8fa01E5066dad14a0Bcd63424dd" },
  { name: "てん", address: "0x280751bAC1a5B6fDD01a94259227703E0F489834" },
  { name: "トマトインティライミ", address: "0xd40758451314Fc8827a2913Ada2CE5AB3dC34eC0" },
  { name: "k", address: "0xc8803Eab170F507f0172d9A7C5081581C6d7893" }
];

const HENESYS_RPC_URL = "https://henesys-rpc.msu.io";
const NESO_CONTRACT_ADDRESS = "0x07E49Ad54FcD23F6e7B911C2068F0148d1827c08";

// ERC20 ABI の最小限
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

let provider, signer, nesoContract;

function log(s){
  const newLogEntry = document.createElement('div');
  newLogEntry.className = 'log-entry';
  newLogEntry.innerHTML = s; // HTMLとして解釈させる
  infoEl.prepend(newLogEntry); // 新しいログを先頭に追加
  infoEl.scrollTop = 0; // 一番上にスクロール
}

async function connectWallet(){
  if (!window.ethereum) { alert("MetaMask が見つかりません"); return; }
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    statusEl.textContent = "接続済み: " + account;

    // Henesysネットワークへの切り替え/追加を試みる
    await addOrSwitchHenesys();

    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    nesoContract = new ethers.Contract(NESO_CONTRACT_ADDRESS, ERC20_ABI, signer);

    // 接続成功後、ボタンを非表示にする
    connectBtn.style.display = 'none';
  } catch (err) {
    console.error(err);
  }
}

// Henesys ネットワーク追加 / 切替
async function addOrSwitchHenesys(){
  if (!window.ethereum) { alert("MetaMask が必要です"); return; }
  const chainIdHex = "0x10B3E"; // 68414
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }]
    });
  } catch (switchError) {
    if (switchError && switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "Henesys",
            nativeCurrency: { name: "NXPC", symbol: "NXPC", decimals: 18 },
            rpcUrls: [HENESYS_RPC_URL],
            blockExplorerUrls: ["https://subnets.avax.network/henesys"]
          }]
        });
      } catch (addErr) {
        console.error(addErr);
      }
    } else {
      console.error(switchError);
    }
  }
}

// 送金
async function sendBatchNESO(){
  if (!nesoContract) { alert("MetaMaskに接続してください"); return; }
  const lines = batchList.value.split("\n").map(l => l.trim()).filter(l => l);
  if (!lines.length) { alert("送金リストが空です"); return; }
  
  // アドレスからユーザー名へのマップを作成
  const addressToNameMap = new Map(ADDRESS_BOOK.map(entry => [entry.address.toLowerCase(), entry.name]));

  // --- 確認メッセージの生成 ---
  const confirmationLines = lines.map(line => {
    const [to, amountStr] = line.split(",").map(x => x.trim());
    if (!to || !amountStr) return null; // 不正な行は無視
    const displayName = addressToNameMap.get(to.toLowerCase()) || to;
    return `${displayName}: ${amountStr} NESO`;
  }).filter(Boolean); // nullを除外

  if (confirmationLines.length === 0) {
    alert("有効な送金先がありません。");
    return;
  }

  const confirmationMessage = "以下の内容で送金を開始します。よろしいですか？\n\n" + confirmationLines.join("\n");

  if (!confirm(confirmationMessage)) {
    return; // ユーザーがキャンセルした場合、処理を中断
  }
  // --- 確認ここまで ---

  sendBtn.disabled = true;
  sendBtn.textContent = '送金中...';
  
  try {
    for (const line of lines){
      const [to, amountStr] = line.split(",").map(x => x.trim());
      if (!to || !amountStr) {
        log(`スキップ: ${line}`);
        continue;
      }
      try {
        const value = ethers.parseUnits(amountStr, 18);
        const tx = await nesoContract.transfer(to, value);
        await tx.wait();
        const displayName = addressToNameMap.get(to.toLowerCase()) || to;
        log(`完了: <span class="log-name">${displayName}</span> に <span class="log-neso">${amountStr} NESO</span> を送金しました。`);
      } catch (err) {
        console.error(err);
        log(`送金エラー (${to}): ${err.message || err}`);
      }
    }
    log("全送金処理終了");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = '送金開始';
  }
}

// アドレス帳から送金リストへ追加
function addRecipientToList() {
  const selectedAddress = singleAddressSelect.value;
  const amount = amountToAdd.value;

  if (!selectedAddress) { alert("プルダウンから宛先を選択してください。"); return; }
  if (!amount || parseFloat(amount) <= 0) { alert("NESOを正しく入力してください。"); return; }

  const newEntries = [{ address: selectedAddress, amount: parseFloat(amount) }];
  updateBatchList(newEntries);

  // 入力欄をクリア
  amountToAdd.value = '';
  singleAddressSelect.value = '';
}

// 送金リストを更新する（既存の宛先があれば加算する）
function updateBatchList(newEntries) { // newEntries: [{ address: string, amount: number }]
  const currentLines = batchList.value.split('\n').map(l => l.trim()).filter(l => l);
  const batchMap = new Map();

  // 1. 現在のリストをMapに解析
  for (const line of currentLines) {
    const [address, amountStr] = line.split(',').map(x => x.trim());
    if (ethers.isAddress(address) && !isNaN(parseFloat(amountStr))) {
      batchMap.set(address.toLowerCase(), { originalAddress: address, amount: parseFloat(amountStr) });
    }
  }

  // 2. 新しいエントリでMapを更新
  for (const entry of newEntries) {
    const lowerCaseAddress = entry.address.toLowerCase();
    const existing = batchMap.get(lowerCaseAddress);
    const newAmount = (existing ? existing.amount : 0) + entry.amount;
    batchMap.set(lowerCaseAddress, { originalAddress: entry.address, amount: newAmount });
  }

  // 3. Mapから新しいリスト文字列を生成
  const newLines = Array.from(batchMap.values()).map(item => `${item.originalAddress},${item.amount}`);
  batchList.value = newLines.join('\n');
}

// 単一宛先追加セクションの表示を切り替える
function toggleSingleAdd() {
  const isHidden = singleAddSection.style.display === 'none' || singleAddSection.style.display === '';
  if (isHidden) {
    singleAddSection.style.display = 'block';
    singleAddSection.classList.add('section-box');
    distributeSection.style.display = 'none';
  } else {
    singleAddSection.style.display = 'none';
    singleAddSection.classList.remove('section-box');
  }
}

// 分配セクションの表示を切り替える
function toggleDistribute() {
  const isHidden = distributeSection.style.display === 'none' || distributeSection.style.display === '';
  if (isHidden) {
    distributeSection.style.display = 'block';
    distributeSection.classList.add('section-box');
    singleAddSection.style.display = 'none';
  } else {
    distributeSection.style.display = 'none';
    distributeSection.classList.remove('section-box');
  }
}

// 分配の報酬を送金リストに追加する
function addDistributeToList() {
  const selectedCheckboxes = partyMembersSelect.querySelectorAll('input[type="checkbox"]:checked');
  const selectedMembers = Array.from(selectedCheckboxes).map(cb => ({
    value: cb.value,
    name: cb.dataset.name // データ属性から名前を取得
  }));

  const includeSelf = includeSelfCheckbox.checked;
  const totalParticipants = selectedMembers.length + (includeSelf ? 1 : 0);

  if (totalParticipants === 0) {
    alert("参加メンバーを1人以上選択してください。");
    return;
  }
  const memberNames = selectedMembers.map(member => member.name);
  if (includeSelf) {
    memberNames.push("自分");
  }

  const rewardType = document.querySelector('input[name="rewardType"]:checked').value;
  let totalNesoAmount = 0;
  let logMessage = '';

  if (rewardType === 'item') {
    const name = itemName.value;
    const quantity = parseFloat(itemQuantity.value);
    let price = parseFloat(itemPrice.value);
    const applyFee = applyFeeCheckbox.checked;

    if (!name || !(quantity > 0) || !(price > 0)) {
      alert("アイテム名、数量、売値を正しく入力してください。");
      return;
    }

    // 数量が10000を超えた場合に確認メッセージを表示
    if (quantity > 10000) {
      if (!confirm(`数量が10,000を超えています (${quantity})。\n数量と売値の入力が正しいか確認してください。\n\nこのまま続行しますか？`)) {
        return; // ユーザーがキャンセルした場合は処理を中断
      }
    }

    const originalPrice = price;
    if (applyFee) {
      price *= 0.95;
    }
    totalNesoAmount = quantity * price;    
    const amountPer = Math.floor(totalNesoAmount / totalParticipants);
    const feeText = applyFee ? ` (手数料適用後 <span class="log-neso">${Math.floor(price)}NESO</span>)` : '';
    
    logMessage = `[B]<br>メンバーの <span class="log-name">${memberNames.join(', ')}</span> に、アイテム売上を分配します。<br>各メンバーに <span class="log-neso">${amountPer} NESO</span> を送金リストに追加しました。<br><br>詳細:<br>・アイテム: ${name} (x${quantity})<br>・単価: <span class="log-neso">${Math.floor(originalPrice)} NESO</span>${feeText}<br>・総額: <span class="log-neso">${Math.floor(totalNesoAmount)} NESO</span>`;

  } else { // neso
    totalNesoAmount = parseFloat(rewardNesoAmount.value);
    if (!(totalNesoAmount > 0)) {
      alert("NESO総額を正しく入力してください。");
      return;
    }
    const amountPer = Math.floor(totalNesoAmount / totalParticipants);

    logMessage = `[B]<br>メンバーの <span class="log-name">${memberNames.join(', ')}</span> に、NESOを分配します。<br>各メンバーに <span class="log-neso">${amountPer} NESO</span> を送金リストに追加しました。<br><br>詳細:<br>・NESO総額: <span class="log-neso">${Math.floor(totalNesoAmount)} NESO</span>`;
  }

  const amountPerRecipient = Math.floor(totalNesoAmount / totalParticipants);

  if (amountPerRecipient < 1) {
    alert("分配後のNESOが1未満になるため、処理を中止しました。合計NESO額を増やしてください。");
    return;
  }

  const newEntries = selectedMembers.map(member => ({ address: member.value, amount: amountPerRecipient }));
  updateBatchList(newEntries);

  const memo = distributeMemo.value.trim();
  if (memo) {
    logMessage += `<br>・メモ: ${memo}`;
  }

  log(logMessage);

  // 入力欄をクリア
  selectedCheckboxes.forEach(cb => {
    cb.checked = false;
  });
  itemName.value = '';
  itemQuantity.value = '';
  itemPrice.value = '';
  applyFeeCheckbox.checked = false;
  rewardNesoAmount.value = '';
  distributeMemo.value = '';
}

// ラジオボタンの変更を監視してアイテム詳細の表示を切り替える
rewardTypeRadios.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (event.target.value === 'item') {
      itemDetails.style.display = 'grid';
      nesoDetails.style.display = 'none';
    } else {
      itemDetails.style.display = 'none';
      nesoDetails.style.display = 'block';
    }
  });
});

function clearList() {
  if (confirm('送金リストを本当にクリアしますか？')) {
    batchList.value = '';
  }
}

function clearLog() {
  if (confirm('実行ログを本当にクリアしますか？')) {
    infoEl.innerHTML = '';
  }
}

connectBtn.onclick = connectWallet;
sendBtn.onclick = sendBatchNESO;
addToListBtn.onclick = addRecipientToList;
toggleSingleAddBtn.onclick = toggleSingleAdd;
toggleDistributeBtn.onclick = toggleDistribute;
addDistributeBtn.onclick = addDistributeToList;
clearListBtn.onclick = clearList;
clearLogBtn.onclick = clearLog;

// MetaMask 状態変化監視
if (window.ethereum) {
  window.ethereum.on && window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length > 0) {
      statusEl.textContent = "接続済み: " + accounts[0];
      connectBtn.style.display = 'none';
    } else {
      statusEl.textContent = "未接続";
      connectBtn.style.display = 'block'; // 切断されたらボタンを再表示
    }
  });
  window.ethereum.on && window.ethereum.on('chainChanged', (chainId) => {
  });
}

// ページ読み込み時にアドレス帳をプルダウンに設定
document.addEventListener('DOMContentLoaded', () => {
  // プルダウンメニューをクリア
  singleAddressSelect.innerHTML = '<option value="">宛先を選択...</option>';
  partyMembersSelect.innerHTML = '';

  ADDRESS_BOOK.forEach(entry => {
    const shortAddress = `${entry.address.substring(0, 6)}...${entry.address.substring(entry.address.length - 4)}`;    
    const option = new Option(`${entry.name} (${shortAddress})`, entry.address);
    singleAddressSelect.add(option.cloneNode(true));

    // PTメンバーリストをチェックボックスで生成
    const memberItem = document.createElement('div');
    memberItem.className = 'member-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = entry.address;
    checkbox.id = `member-${entry.address}`;
    checkbox.dataset.name = entry.name; // 後で名前を取得するためにデータ属性に保存
    const label = document.createElement('label');
    label.htmlFor = `member-${entry.address}`;
    label.innerHTML = `<span class="member-name">${entry.name}</span><span class="member-address">${shortAddress}</span>`;
    
    memberItem.appendChild(checkbox);
    memberItem.appendChild(label);
    partyMembersSelect.appendChild(memberItem);
  });
});