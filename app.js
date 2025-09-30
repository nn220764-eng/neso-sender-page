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

// PT分配機能用
const ptDistributeSection = document.getElementById('ptDistributeSection');
const togglePtDistributeBtn = document.getElementById('togglePtDistributeBtn');
const partyMembersSelect = document.getElementById('partyMembersSelect');
const rewardTypeRadios = document.querySelectorAll('input[name="rewardType"]');
const itemDetails = document.getElementById('itemDetails');
const itemName = document.getElementById('itemName');
const itemQuantity = document.getElementById('itemQuantity');
const itemPrice = document.getElementById('itemPrice');
const nesoDetails = document.getElementById('nesoDetails');
const rewardNesoAmount = document.getElementById('rewardNesoAmount');
const addPtRewardBtn = document.getElementById('addPtRewardBtn');

// --- アドレス帳 ---
// ここに名前とアドレスのリストを追加・編集してください
const ADDRESS_BOOK = [
  { name: "とずんぷ", address: "0x78B7e02A145531146Ae6F775AcC268F039c19f34" },
  { name: "げこ", address: "0xf050864d86aBEC249d0608e83c859c05922c9209" },
  { name: "全自動掃除機", address: "0x0d0501c4Bd4c4E6547578bBCc973789182b82996" },
  { name: "りーばん", address: "0x25916fa1ad3ACe825F71f9c78A0fE1328Cc3aBb2" },
  { name: "shikis", address: "0x032C1264B64FFb10c405862eEE61Cb4860289F03" },
  { name: "poyupuri", address: "0xaa95cF1ECA2b74De15f98Cb5408a974374B42d7B" },
  { name: "satou", address: "0xeE7670e0Eb30932868CE2013228a030D94DB949A" },
  { name: "tonga_ri", address: "0xE1Dc7F44706346D870824bB22779797Ff8aAd480" },
  { name: "トマトインティライミ", address: "0xd40758451314Fc8827a2913Ada2CE5AB3dC34eC0" },
  { name: "あんめるつ", address: "0x47eF79F9d201b8fa01E5066dad14a0Bcd63424dd" },
  { name: "てん", address: "0x280751bAC1a5B6fDD01a94259227703E0F489834" },
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
  infoEl.textContent += s + "\n";
  // ログ表示エリアを自動で一番下までスクロール
  infoEl.scrollTop = infoEl.scrollHeight;
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

// 複数送金
async function sendBatchNESO(){
  if (!nesoContract) { alert("MetaMaskに接続してください"); return; }
  const lines = batchList.value.split("\n").map(l => l.trim()).filter(l => l);
  if (!lines.length) { alert("送金リストが空です"); return; }

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
      log(`完了: ${to} に ${amountStr} NESO`);
    } catch (err) {
      console.error(err);
      log(`送金エラー (${to}): ${err.message || err}`);
    }
  }
  log("全送金処理終了");
}

// アドレス帳から送金リストへ追加
function addRecipientToList() {
  const selectedAddress = singleAddressSelect.value;
  const amount = amountToAdd.value;

  if (!selectedAddress) { alert("プルダウンから宛先を選択してください。"); return; }
  if (!amount || parseFloat(amount) <= 0) { alert("NESOを正しく入力してください。"); return; }

  const newLine = `${selectedAddress},${amount}`;
  
  // テキストエリアが空でなければ改行を追加
  if (batchList.value.trim() !== '') {
    batchList.value += '\n' + newLine;
  } else {
    batchList.value = newLine;
  }
  // 入力欄をクリア
  amountToAdd.value = '';
  singleAddressSelect.value = '';
}

// 単一宛先追加セクションの表示を切り替える
function toggleSingleAdd() {
  const isHidden = singleAddSection.style.display === 'none' || singleAddSection.style.display === '';
  if (isHidden) {
    singleAddSection.style.display = 'block';
    ptDistributeSection.style.display = 'none';
  } else {
    singleAddSection.style.display = 'none';
  }
}

// 複数宛先分配セクションの表示を切り替える

// PT分配セクションの表示を切り替える
function togglePtDistribute() {
  const isHidden = ptDistributeSection.style.display === 'none' || ptDistributeSection.style.display === '';
  if (isHidden) {
    ptDistributeSection.style.display = 'block';
    singleAddSection.style.display = 'none';
  } else {
    ptDistributeSection.style.display = 'none';
  }
}

// PT分配の報酬を送金リストに追加する
function addPtRewardToList() {
  const selectedMembers = Array.from(partyMembersSelect.selectedOptions);
  if (selectedMembers.length === 0) {
    alert("参加PTメンバーを1人以上選択してください。");
    return;
  }
  const memberNames = selectedMembers.map(opt => opt.text.split(' (')[0]).join(', ');

  const rewardType = document.querySelector('input[name="rewardType"]:checked').value;
  let totalNesoAmount = 0;
  let logMessage = '';

  if (rewardType === 'item') {
    const name = itemName.value;
    const quantity = parseFloat(itemQuantity.value);
    const price = parseFloat(itemPrice.value);
    if (!name || !(quantity > 0) || !(price > 0)) {
      alert("アイテム名、数量、売値を正しく入力してください。");
      return;
    }
    totalNesoAmount = quantity * price;
    logMessage = `[PT分配] ${memberNames} に各 ${Math.floor(totalNesoAmount / selectedMembers.length)} NESO をリストに追加しました。 (アイテム: ${name} x${quantity}, 単価: ${price}, 総額: ${totalNesoAmount} NESO)`;
  } else { // neso
    totalNesoAmount = parseFloat(rewardNesoAmount.value);
    if (!(totalNesoAmount > 0)) {
      alert("NESO総額を正しく入力してください。");
      return;
    }
    logMessage = `[PT分配] ${memberNames} に各 ${Math.floor(totalNesoAmount / selectedMembers.length)} NESO をリストに追加しました。`;
  }

  const amountPerRecipient = Math.floor(totalNesoAmount / selectedMembers.length);

  if (amountPerRecipient < 1) {
    alert("分配後のNESOが1未満になるため、処理を中止しました。合計数量を増やしてください。");
    return;
  }

  const newLines = selectedMembers.map(option => `${option.value},${amountPerRecipient}`).join('\n');

  if (batchList.value.trim() !== '') {
    batchList.value += '\n' + newLines;
  } else {
    batchList.value = newLines;
  }

  log(logMessage);

  // 入力欄をクリア
  partyMembersSelect.selectedIndex = -1;
  itemName.value = '';
  itemQuantity.value = '';
  itemPrice.value = '';
  rewardNesoAmount.value = '';
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

connectBtn.onclick = connectWallet;
sendBtn.onclick = sendBatchNESO;
addToListBtn.onclick = addRecipientToList;
toggleSingleAddBtn.onclick = toggleSingleAdd;
togglePtDistributeBtn.onclick = togglePtDistribute;
addPtRewardBtn.onclick = addPtRewardToList;

// MetaMask 状態変化監視
if (window.ethereum) {
  window.ethereum.on && window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) { statusEl.textContent = "未接続"; }
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
    const option = new Option(`${entry.name} (${entry.address})`, entry.address);
    singleAddressSelect.add(option.cloneNode(true));
    partyMembersSelect.add(option.cloneNode(true));
  });
});