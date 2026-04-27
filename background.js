console.log("=== BACKGROUND.JS : Démarrage ===");

let STUDIO_DATABASE = {};
let COUNTRY_DATABASE = {};
let dbReady = false;

Promise.all([
  fetch(chrome.runtime.getURL('data/studios.json')).then(res => res.json()),
  fetch(chrome.runtime.getURL('data/countries.json')).then(res => res.json())
]).then(([studiosData, countriesData]) => {
  STUDIO_DATABASE = {};
  studiosData.forEach(studio => {
    STUDIO_DATABASE[studio.studio] = studio;
  });
  COUNTRY_DATABASE = countriesData.countries;
  dbReady = true;
  console.log("✅ [BACKGROUND] Bases chargées :",
    Object.keys(STUDIO_DATABASE).length, "studios |",
    Object.keys(COUNTRY_DATABASE).length, "pays");
  console.log("🔍 [BACKGROUND] Exemples de clés studios :", Object.keys(STUDIO_DATABASE).slice(0, 5));
}).catch(err => {
  console.error("❌ [BACKGROUND] Erreur chargement DB :", err);
});

function waitForDB() {
  return new Promise((resolve) => {
    if (dbReady) { resolve(); return; }
    const iv = setInterval(() => { if (dbReady) { clearInterval(iv); resolve(); } }, 100);
  });
}

// ── Stockage persistant via chrome.storage.session ────────────────────────
async function setTabResult(tabId, value) {
  await chrome.storage.session.set({ [`tab_${tabId}`]: value });
  console.log(`[BACKGROUND] session.set tab_${tabId} →`, JSON.stringify(value));
}

async function getTabResult(tabId) {
  const res = await chrome.storage.session.get(`tab_${tabId}`);
  return res[`tab_${tabId}`] || null;
}

async function deleteTabResult(tabId) {
  await chrome.storage.session.remove(`tab_${tabId}`);
  console.log(`[BACKGROUND] session.remove tab_${tabId}`);
}

const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1497173963145478144/9T3ZWYuxjnhFCLnsAcJhu-BMf9w8n7gOwm3Cvjb5fgqPqREPjrupUrtjjMNhQ1GsozmC";

async function reportUnknownStudio(studioName) {
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Banshee · Studio Inconnu",
        avatar_url: "https://i.imgur.com/4M34hi2.png",
        embeds: [{
          title: "❓ Studio non répertorié",
          color: 0x4b5563,
          fields: [{ name: "Studio détecté", value: `\`${studioName}\``, inline: false }],
          footer: { text: "Banshee · Rapport automatique anonyme" },
          timestamp: new Date().toISOString()
        }]
      })
    });
    console.log(`📡 [BACKGROUND] Studio inconnu signalé : "${studioName}"`);
  } catch (err) {
    console.warn(`⚠️ [BACKGROUND] Erreur webhook :`, err);
  }
}

function getStudioFullInfo(studioName) {
  let studio = STUDIO_DATABASE[studioName] || STUDIO_DATABASE[studioName.toLowerCase()];

  if (!studio) {
    const keys = Object.keys(STUDIO_DATABASE);
    const close = keys.find(k => k.toLowerCase() === studioName.toLowerCase());
    if (close) {
      console.warn(`⚠️ [BACKGROUND] Correspondance insensible à la casse : "${studioName}" → "${close}"`);
      studio = STUDIO_DATABASE[close];
    }
  }

  if (!studio) {
    console.log(`🔍 [BACKGROUND] Studio "${studioName}" NON trouvé dans la DB`);
    return { found: false, studioName };
  }

  const codePays    = studio.code_pays;
  const countryInfo = COUNTRY_DATABASE[codePays] || null;
  console.log(`✅ [BACKGROUND] Studio trouvé : "${studioName}" → code="${codePays}" eu=${countryInfo?.eu}`);
  return {
    found:       true,
    studioName,
    codePays,
    countryName: countryInfo ? countryInfo.nom : null,
    isEuropean:  countryInfo ? !!countryInfo.eu : null
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? null;
  console.log(`📨 [BACKGROUND] Message "${request.action}" — tab=${tabId}`);

  // ── detectionStarted : on accuse juste réception, on n'écrit RIEN en storage.
  // Seul checkStudio a le droit d'écrire le résultat.
  if (request.action === "detectionStarted") {
    console.log(`[BACKGROUND] tab ${tabId} → detectionStarted reçu (ignoré pour le stockage)`);
    sendResponse({ ok: true });
    return true;
  }

  // ── content.js vérifie un studio ─────────────────────────────────────
  if (request.action === "checkStudio") {
    console.log(`[BACKGROUND] checkStudio "${request.studioName}" (tab ${tabId})`);

    (async () => {
      await waitForDB();
      const info = getStudioFullInfo(request.studioName);
      const status = (!info.found || info.isEuropean === null)
        ? "inconnu"
        : (info.isEuropean ? "valid" : "invalid");

      if (status === "inconnu") {
        reportUnknownStudio(request.studioName);
      }

      if (tabId != null) {
        await setTabResult(tabId, { status, ...info });
        console.log(`✅ [BACKGROUND] tab ${tabId} stocké → status="${status}" studio="${request.studioName}"`);
      } else {
        console.warn(`⚠️ [BACKGROUND] checkStudio sans tab ID — résultat NON stocké !`);
      }

      sendResponse({
        isEuropean:  info.isEuropean,
        codePays:    info.codePays    || null,
        countryName: info.countryName || null
      });
    })();
    return true;
  }

  // ── popup.js demande le résultat stocké pour un onglet ────────────────
  if (request.action === "getTabResult") {
    (async () => {
      const result = await getTabResult(request.tabId);
      console.log(`[BACKGROUND] getTabResult tab ${request.tabId} →`, JSON.stringify(result));
      sendResponse(result);
    })();
    return true;
  }
});

// ── webNavigation : reset au chargement d'une nouvelle page de jeu ────────
chrome.webNavigation.onCompleted.addListener((details) => {
  const isSteam         = details.url.includes("steampowered.com");
  const isInstantGaming = details.url.includes("instant-gaming.com");
  const isSteamDB       = details.url.includes("steamdb.info");

  if (!isSteam && !isInstantGaming && !isSteamDB) return;

  console.log(`[BACKGROUND] webNavigation.onCompleted tab=${details.tabId} url=${details.url}`);

  (async () => {
    // Détection page de jeu selon le site
    const isSteamGame   = isSteam         && /\/app\/\d+\//.test(details.url);
    const isIGGame      = isInstantGaming && /\/[a-z]{2}\/\d+-/.test(new URL(details.url).pathname);
    const isSteamDBGame = isSteamDB       && /\/app\/\d+/.test(new URL(details.url).pathname);
    const isGamePage    = isSteamGame || isIGGame || isSteamDBGame;

    if (!isGamePage) {
      await deleteTabResult(details.tabId);
      console.log(`[BACKGROUND] tab ${details.tabId} → pas une page jeu, entrée supprimée`);
      return;
    }

    // Nouvelle page de jeu : reset pour que le popup affiche "loading"
    await deleteTabResult(details.tabId);
    console.log(`[BACKGROUND] tab ${details.tabId} → nouvelle page jeu (${isSteam ? "Steam" : isSteamDB ? "SteamDB" : "Instant Gaming"}), reset`);

    // Tente de relancer content.js si pas encore actif
    chrome.tabs.sendMessage(details.tabId, { action: "retryDetection" }, () => {
      if (chrome.runtime.lastError) {
        console.log("⚠️ [BACKGROUND] content.js absent, injection...");
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          files: ["content.js"]
        }).catch(e => console.error("[BACKGROUND] Erreur injection :", e));
      }
    });
  })();
});

// Nettoyage à la fermeture d'un onglet
chrome.tabs.onRemoved.addListener((tabId) => {
  deleteTabResult(tabId);
  console.log(`[BACKGROUND] tab ${tabId} fermé → entrée supprimée`);
});
