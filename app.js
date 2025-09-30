const statusEl = document.getElementById('status');
const infoEl = document.getElementById('info');
const connectBtn = document.getElementById('connectBtn');
const sendBtn = document.getElementById('sendBtn');
const batchList = document.getElementById('batchList');

const HENESYS_RPC_URL = "https://henesys-rpc.msu.io";
const NESO_CONTRACT_ADDRESS = "0x07E49Ad54FcD23F6e7B911C2068F0148d1827c08";

// ERC20 ABI の最小限
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

let provider, signer, nesoContract;

function log(s){ infoEl.textContent += s + "\n"; }

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

connectBtn.onclick = connectWallet;
sendBtn.onclick = sendBatchNESO;

// MetaMask 状態変化監視
if (window.ethereum) {
  window.ethereum.on && window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) { statusEl.textContent = "未接続"; }
  });
  window.ethereum.on && window.ethereum.on('chainChanged', (chainId) => {
  });
}