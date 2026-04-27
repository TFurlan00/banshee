// === BANSHEE — POPUP.JS ===

// ── Traductions ────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    loading:              "Détection en cours…",
    no_game:              "Aucun jeu détecté",
    no_game_sub:          "Navigue sur une page de jeu pour voir les informations.",
    studio_eu:            "Studio Européen",
    hors_europe:          "Hors Europe",
    studio_inconnu:       "Studio inconnu",
    inconnu_sub:          "Ce studio n'est pas dans notre base.",
    signaler:             "Signaler",
    settings_title:       "Paramètres",
    settings_apparence:   "Apparence",
    settings_mini_popup:  "Montrer les mini popup",
    settings_inconnu_lbl: "Montrer popup lorsque inconnu",
    settings_apropos:     "À propos",
    settings_apropos_txt: "Banshee v2.1 — Extension de suivi des studios européens sur Steam & Instant Gaming. Développée pour soutenir les jeux made in EU.",
    settings_contribuer:  "Contribuer",
    settings_contribuer_txt: "Un studio manquant ?",
    settings_contribuer_lnk: "Rejoins le Discord",
    settings_soutenir:    "Soutenir",
    settings_soutenir_txt: "Banshee est gratuit et sans pub. Si tu l'apprécies, un petit café fait vraiment la différence ☕",
    settings_soutenir_btn: "Soutenir sur Ko-fi",
    settings_don:         "Soutenir le projet",
    settings_don_txt:     "Banshee est gratuite et sans pub. Si elle t'aide à mieux choisir tes jeux,",
    settings_don_lnk:     "un petit don fait vraiment la différence ☕",
  },
  en: {
    loading:              "Detecting…",
    no_game:              "No game detected",
    no_game_sub:          "Browse a game page to see information.",
    studio_eu:            "European Studio",
    hors_europe:          "Outside Europe",
    studio_inconnu:       "Unknown Studio",
    inconnu_sub:          "This studio is not in our database.",
    signaler:             "Report",
    settings_title:       "Settings",
    settings_apparence:   "Appearance",
    settings_mini_popup:  "Show mini popups",
    settings_inconnu_lbl: "Show popup when unknown",
    settings_apropos:     "About",
    settings_apropos_txt: "Banshee v2.1 — European studio tracker on Steam & Instant Gaming. Made to support EU-made games.",
    settings_contribuer:  "Contribute",
    settings_contribuer_txt: "A studio missing?",
    settings_contribuer_lnk: "Join the Discord",
    settings_soutenir:    "Support",
    settings_soutenir_txt: "Banshee is free and ad-free. If you enjoy it, buying a coffee really helps ☕",
    settings_soutenir_btn: "Support on Ko-fi",
    settings_don:         "Support the project",
    settings_don_txt:     "Banshee is free and ad-free. If it helps you make better choices,",
    settings_don_lnk:     "a small donation means a lot ☕",
  }
};

let currentLang   = "fr";
let currentResult = null;
let inSettings    = false;

function t(key) {
  return TRANSLATIONS[currentLang][key] || TRANSLATIONS["fr"][key] || key;
}

// ── Nom de pays localisé via l'API native du navigateur ───────────────────
function getCountryName(code, lang) {
  if (!code || code.length !== 2) return null;
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase());
  } catch {
    return code;
  }
}

// ── Navigation Paramètres ─────────────────────────────────────────────────
function openSettings() {
  inSettings = true;
  document.getElementById("header-title").textContent = t("settings_title");
  const btn = document.getElementById("btn-settings");
  btn.textContent = "←";
  btn.classList.add("back-btn");
  showState("settings");
}

function closeSettings() {
  inSettings = false;
  document.getElementById("header-title").textContent = "Banshee";
  const btn = document.getElementById("btn-settings");
  btn.textContent = "⚙️";
  btn.classList.remove("back-btn");
  // Revenir à l'état précédent
  if (currentResult && currentResult.status !== "pending") {
    render(currentResult);
  } else {
    showState("loading");
  }
}

// ── Langue ────────────────────────────────────────────────────────────────
function applyLang() {
  document.getElementById("lang-fr").classList.toggle("active", currentLang === "fr");
  document.getElementById("lang-en").classList.toggle("active", currentLang === "en");

  document.querySelector("#state-loading .state-label").textContent = t("loading");
  document.querySelector("#state-no_game .state-title").textContent = t("no_game");
  document.querySelector("#state-no_game .state-sub").textContent   = t("no_game_sub");
  document.querySelector("#state-valid .badge-text").textContent    = t("studio_eu");
  document.querySelector("#state-invalid .badge-text").textContent  = t("hors_europe");
  document.querySelector("#state-inconnu .badge-text").textContent  = t("studio_inconnu");

  // Mettre à jour le titre du header si on est dans les paramètres
  if (inSettings) {
    document.getElementById("header-title").textContent = t("settings_title");
  }

  const inconnu_sub = document.querySelector("#state-inconnu .state-sub");
  if (inconnu_sub) {
    inconnu_sub.innerHTML = `${t("inconnu_sub")} <a href="https://discord.gg/DPush3mCUa" target="_blank" class="link">${t("signaler")}</a>`;
  }

  // ── Page Paramètres ───────────────────────────────────────────────────
  const s = document.getElementById("state-settings");
  if (s) {
    const titles = s.querySelectorAll(".settings-section-title");
    if (titles[0]) titles[0].textContent = t("settings_apparence");
    if (titles[1]) titles[1].textContent = t("settings_apropos");
    if (titles[2]) titles[2].textContent = t("settings_contribuer");

    const rowMiniLabel    = document.querySelector("#row-mini .settings-row-label");
    const rowInconnuLabel = document.querySelector("#row-inconnu .settings-row-label");
    if (rowMiniLabel)    rowMiniLabel.textContent    = t("settings_mini_popup");
    if (rowInconnuLabel) rowInconnuLabel.textContent = t("settings_inconnu_lbl");

    const aproposP = s.querySelector("#settings-apropos-txt");
    if (aproposP) aproposP.textContent = t("settings_apropos_txt");

    const contribuerP = s.querySelector("#settings-contribuer-txt");
    if (contribuerP) {
      contribuerP.innerHTML = `${t("settings_contribuer_txt")} <a href="https://discord.gg/DPush3mCUa" target="_blank" class="link">${t("settings_contribuer_lnk")}</a>`;
    }

    const soutenirTitle = s.querySelector("#settings-soutenir-title");
    if (soutenirTitle) soutenirTitle.textContent = t("settings_soutenir");
    const soutenirTxt = s.querySelector("#settings-soutenir-txt");
    if (soutenirTxt) soutenirTxt.textContent = t("settings_soutenir_txt");
    const soutenirBtn = s.querySelector("#settings-soutenir-btn");
    if (soutenirBtn) soutenirBtn.textContent = t("settings_soutenir_btn");

    const donP = s.querySelector("#settings-don-txt");
    if (donP) {
      donP.innerHTML = `${t("settings_don_txt")} <a href="https://ko-fi.com/lichebanshee" target="_blank" class="link paypal-link">${t("settings_don_lnk")}</a>`;
    }

    if (titles[3]) titles[3].textContent = t("settings_don");
  }

  if (!inSettings && currentResult && currentResult.status !== "pending") {
    render(currentResult);
  }
}

function setLang(lang) {
  currentLang = lang;
  chrome.storage.local.set({ banshee_lang: lang });
  applyLang();
  console.log(`[POPUP] Langue → ${lang}`);
}

// ── UI ────────────────────────────────────────────────────────────────────
function setFlagImg(elementId, code) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (code && code.length === 2) {
    el.innerHTML = `<img src="https://flagcdn.com/w40/${code.toLowerCase()}.png" alt="${code}" style="width:40px;height:auto;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">`;
  } else {
    el.innerHTML = "🏳️";
  }
}

function showState(id) {
  document.querySelectorAll(".state").forEach(el => el.classList.remove("active"));
  const el = document.getElementById("state-" + id);
  if (el) el.classList.add("active");
}

function renderValid(result) {
  setFlagImg("valid-flag", result.codePays);
  document.getElementById("valid-studio").textContent  = result.studioName || "—";
  document.getElementById("valid-country").textContent = getCountryName(result.codePays, currentLang) || result.countryName || "—";
  showState("valid");
}

function renderInvalid(result) {
  setFlagImg("invalid-flag", result.codePays);
  document.getElementById("invalid-studio").textContent  = result.studioName || "—";
  document.getElementById("invalid-country").textContent = getCountryName(result.codePays, currentLang) || result.countryName || "—";
  showState("invalid");
}

function renderInconnu(studioName) {
  const el = document.getElementById("inconnu-studio");
  if (el) el.textContent = studioName || t("studio_inconnu");
  showState("inconnu");
}

function askBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

async function render(result) {
  currentResult = result;
  if (!result)                      { showState("no_game");  return; }
  if (result.status === "pending")  { showState("loading");  return; }
  if (result.status === "valid")    { renderValid(result);   return; }
  if (result.status === "invalid")  { renderInvalid(result); return; }
  renderInconnu(result.studioName);
}

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Charge la langue sauvegardée
  const stored = await chrome.storage.local.get(["banshee_lang", "banshee_mini_popup", "banshee_inconnu_popup"]);
  currentLang = stored.banshee_lang || "en";
  applyLang();

  // Charge les réglages mini popup
  const miniPopupEnabled    = stored.banshee_mini_popup !== false;
  const inconnuPopupEnabled = stored.banshee_inconnu_popup === true;

  const toggleEl      = document.getElementById("toggle-mini-popup");
  const toggleInconnu = document.getElementById("toggle-inconnu-popup");
  const rowInconnu    = document.getElementById("row-inconnu");

  function updateInconnuRowState(enabled) {
    if (rowInconnu)    rowInconnu.style.opacity    = enabled ? "1" : "0.35";
    if (toggleInconnu) toggleInconnu.disabled      = !enabled;
  }

  if (toggleEl) {
    toggleEl.checked = miniPopupEnabled;
    updateInconnuRowState(miniPopupEnabled);
    toggleEl.addEventListener("change", () => {
      chrome.storage.local.set({ banshee_mini_popup: toggleEl.checked });
      updateInconnuRowState(toggleEl.checked);
    });
  }

  if (toggleInconnu) {
    toggleInconnu.checked = inconnuPopupEnabled;
    toggleInconnu.addEventListener("change", () => {
      chrome.storage.local.set({ banshee_inconnu_popup: toggleInconnu.checked });
    });
  }

  // 2. Listeners langue
  document.getElementById("lang-fr").addEventListener("click", () => setLang("fr"));
  document.getElementById("lang-en").addEventListener("click", () => setLang("en"));

  // 3. Bouton Paramètres / Retour
  document.getElementById("btn-settings").addEventListener("click", () => {
    if (inSettings) closeSettings();
    else openSettings();
  });

  showState("loading");

  // 4. Onglet actif
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (e) {
    showState("no_game");
    return;
  }

  if (!tab?.url) { showState("no_game"); return; }

  const isGamePage = /steampowered\.com\/app\/\d+/.test(tab.url);
  if (!isGamePage) { showState("no_game"); return; }

  // 5. Résultat depuis background
  const result = await askBackground({ action: "getTabResult", tabId: tab.id });

  if (!result || result.status === "pending") {
    showState("loading");

    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 500));
      const updated = await askBackground({ action: "getTabResult", tabId: tab.id });
      if (updated && updated.status !== "pending") {
        await render(updated);
        return;
      }
    }

    console.warn("[POPUP] ❌ Timeout : toujours pending après 12s. Tentative de relance...");
    chrome.tabs.sendMessage(tab.id, { action: "retryDetection" }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ["content.js"] }
        ).catch(e => console.error("[POPUP] Erreur injection content.js :", e));
      }
    });
    renderInconnu(null);
    return;
  }

  await render(result);
});
