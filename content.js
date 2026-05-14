// === BANSHEE : DÉTECTION (Steam + Instant Gaming) ===
console.log("=== BANSHEE : Détection du studio ===");

let isDetecting = false;

// ── Détection du site ─────────────────────────────────────────────────────
const hostname = window.location.hostname;
const pathname = window.location.pathname;

const isSteam         = hostname.includes("steampowered.com");
const isInstantGaming = hostname.includes("instant-gaming.com");
const isSteamDB       = hostname.includes("steamdb.info");

const isSteamGamePage   = isSteam         && /^\/app\/\d+\//.test(pathname);
const isIGGamePage      = isInstantGaming  && /^\/[a-z]{2}\/\d+-/.test(pathname);
const isSteamDBGamePage = isSteamDB        && /^\/app\/\d+/.test(pathname);
const isGamePage        = isSteamGamePage || isIGGamePage || isSteamDBGamePage;

console.log(`[CONTENT] Site: ${isSteam ? "Steam" : isInstantGaming ? "InstantGaming" : isSteamDB ? "SteamDB" : "inconnu"} | Page jeu: ${isGamePage}`);

// ── Sélecteurs Steam ──────────────────────────────────────────────────────
// On cible uniquement les liens pointant vers steampowered.com/developer/
// pour ignorer les liens injectés par l'extension SteamDB (steamdb.info/developer/)
const STEAM_STUDIO_SELECTORS = [
  "#developers_list a[href*='steampowered.com/developer']",
  ".dev_row .summary a[href*='steampowered.com/developer']",
  ".game_details .dev_row a[href*='steampowered.com/developer']",
  ".details_block a[href*='steampowered.com/developer']",
  ".block_bg_inner a[href*='steampowered.com/developer']",
];

// ── Traductions bannières ─────────────────────────────────────────────────
const BANNER_TRANSLATIONS = {
  fr: {
    valid_badge:   "✓ Studio Européen",
    invalid_badge: "✕ Hors Europe",
    inconnu_badge: "? Studio inconnu",
    inconnu_sub:   "Pas dans notre base",
    inconnu_name:  "Non répertorié",
  },
  en: {
    valid_badge:   "✓ European Studio",
    invalid_badge: "✕ Outside Europe",
    inconnu_badge: "? Unknown Studio",
    inconnu_sub:   "Not in our database",
    inconnu_name:  "Not listed",
  }
};

function getCountryName(code, lang) {
  if (!code || code.length !== 2) return null;
  try { return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()); }
  catch { return code; }
}

// ── Détection Steam ───────────────────────────────────────────────────────
function detectStudioSteam() {
  for (const selector of STEAM_STUDIO_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) {
      const name = el.textContent.trim();
      if (name && !name.includes("Voir tous") && name.length > 2) {
        console.log(`[CONTENT-STEAM] Studio : "${name}"`);
        return name;
      }
    }
  }
  return null;
}

// ── Détection Instant Gaming ──────────────────────────────────────────────
// Structure réelle confirmée :
// <tr>
//   <th>Développeur:</th>
//   <th><div class="clamp"><a class="tag tag9540" href="/fr/decouvrir/developpeurs/brimstone/">Brimstone</a></div></th>
// </tr>
function detectStudioIG() {

  // Stratégie 1 : th "Développeur" → tr → 2ème th → a  (sélecteur confirmé ✅)
  const ths = document.querySelectorAll("th");
  for (const th of ths) {
    if (/développeur|developer/i.test(th.textContent)) {
      const tr = th.closest("tr");
      if (!tr) continue;
      const allThs  = tr.querySelectorAll("th");
      const valueTh = allThs[1] || tr.querySelector("td");
      if (!valueTh) continue;
      const link = valueTh.querySelector("a");
      const raw  = (link || valueTh).textContent.trim().split(",")[0].trim();
      if (raw && raw.length > 1) {
        console.log(`[CONTENT-IG] Studio via th→tr : "${raw}"`);
        return raw;
      }
    }
  }

  // Stratégie 2 : lien direct /decouvrir/developpeurs/ ou /discover/developers/
  const devLink = document.querySelector(
    'a[href*="/decouvrir/developpeurs/"], a[href*="/discover/developers/"]'
  );
  if (devLink) {
    const name = devLink.textContent.trim();
    if (name && name.length > 1) {
      console.log(`[CONTENT-IG] Studio via lien developpeurs : "${name}"`);
      return name;
    }
  }

  // Stratégie 3 : JSON-LD fallback
  try {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      let data;
      try { data = JSON.parse(script.textContent); } catch { continue; }
      const obj = Array.isArray(data) ? data[0] : data;
      if (!obj) continue;
      for (const c of [obj.author?.name, obj.publisher?.name, obj.developer?.name]) {
        if (c && c.length > 1) {
          console.log(`[CONTENT-IG] Studio via JSON-LD : "${c}"`);
          return c;
        }
      }
    }
  } catch (_) {}

  return null;
}

// ── Détection SteamDB ─────────────────────────────────────────────────────
function detectStudioSteamDB() {
  // Stratégie 1 : ligne de tableau contenant "Developer"
  const rows = document.querySelectorAll("tr");
  for (const row of rows) {
    const cells = row.querySelectorAll("td, th");
    for (let i = 0; i < cells.length - 1; i++) {
      if (/developer/i.test(cells[i].textContent)) {
        const link = cells[i + 1].querySelector("a");
        const name = (link || cells[i + 1]).textContent.trim().split(",")[0].trim();
        if (name && name.length > 1) {
          console.log(`[CONTENT-STEAMDB] Studio via tr : "${name}"`);
          return name;
        }
      }
    }
  }

  // Stratégie 2 : lien direct /developer/
  const devLink = document.querySelector('a[href*="/developer/"]');
  if (devLink) {
    const name = devLink.textContent.trim();
    if (name && name.length > 1) {
      console.log(`[CONTENT-STEAMDB] Studio via lien : "${name}"`);
      return name;
    }
  }

  return null;
}

function detectStudio() {
  if (isSteamGamePage)   return detectStudioSteam();
  if (isIGGamePage)      return detectStudioIG();
  if (isSteamDBGamePage) return detectStudioSteamDB();
  return null;
}

// ── Bannière ──────────────────────────────────────────────────────────────
function afficherBanniere(type, info) {
  chrome.storage.local.get(["banshee_mini_popup", "banshee_inconnu_popup"], (settings) => {
    if (settings.banshee_mini_popup === false) {
      console.log("[CONTENT] Mini popup désactivés.");
      return;
    }
    if (type === "inconnu" && settings.banshee_inconnu_popup === false) {
      console.log("[CONTENT] Popup inconnu désactivé.");
      return;
    }
    _afficherBanniere(type, info);
  });
}

function _afficherBanniere(type, info) {
  if (document.getElementById("banshee-banner")) return;

  // Lire HD + langue en une seule fois AVANT de choisir le fichier
  chrome.storage.local.get(["banshee_hd", "banshee_lang"], ({ banshee_hd, banshee_lang }) => {
    const isHD = banshee_hd === true;

    const fichiers = {
      valid:   isHD ? "PopupEUvalid_large.html"     : "PopupEUvalid.html",
      invalid: isHD ? "POPUPEUINVALID_large.html"   : "POPUPEUINVALID.html",
      inconnu: isHD ? "POPUPEUINCONNU_large.html"   : "POPUPEUINCONNU.html"
    };

    fetch(chrome.runtime.getURL(fichiers[type]))
      .then(res => res.text())
      .then(html => {
        const wrap = document.createElement("div");
        wrap.className = "banshee-wrap";
        wrap.style.cssText = "position:fixed;top:80px;right:20px;z-index:99999;pointer-events:none;";
        wrap.innerHTML = html;
        document.body.appendChild(wrap);

          const lang = banshee_lang || "fr";
          const tr   = BANNER_TRANSLATIONS[lang] || BANNER_TRANSLATIONS.fr;

        const badgeEl = wrap.querySelector(".b-badge");
        const subEl   = wrap.querySelector(".b-sub");

        if (badgeEl) {
          if (type === "valid")   badgeEl.textContent = tr.valid_badge;
          if (type === "invalid") badgeEl.textContent = tr.invalid_badge;
          if (type === "inconnu") badgeEl.textContent = tr.inconnu_badge;
        }
        if (subEl && type === "inconnu") subEl.textContent = tr.inconnu_sub;

        if (info) {
          const studioEl  = wrap.querySelector("#b-studio");
          const countryEl = wrap.querySelector("#b-country");
          const flagEl    = wrap.querySelector("#b-flag");

          if (studioEl && info.studioName) {
            studioEl.textContent = info.studioName
              .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          }
          if (countryEl) {
            countryEl.textContent = getCountryName(info.codePays, lang) || info.countryName || "";
          }
          if (flagEl && info.codePays?.length === 2) {
            const img = document.createElement("img");
            img.src = `https://flagcdn.com/w40/${info.codePays.toLowerCase()}.png`;
            img.alt = info.codePays;
            img.style.cssText = "width:32px;height:auto;border-radius:3px;box-shadow:0 2px 6px rgba(0,0,0,0.5);display:block;";
            flagEl.innerHTML = "";
            flagEl.appendChild(img);
          }
        } else if (type === "inconnu") {
          const studioEl = wrap.querySelector("#b-studio");
          if (studioEl) studioEl.textContent = tr.inconnu_name;
        }

        console.log(`✅ [CONTENT] Bannière "${type}" ${isHD ? "(large)" : ""} injectée`);
      })
      .catch(err => console.error("[CONTENT] Erreur bannière :", err));
  });
}

function envoyerStudio(studioRaw, isRetry = false) {
  const studioNormalized = studioRaw.replace(/\s+/g, " ").toLowerCase();
  console.log(`📤 [CONTENT] Envoi de "${studioNormalized}" (retry=${isRetry})...`);

  chrome.runtime.sendMessage(
    { action: "checkStudio", studioName: studioNormalized },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("[CONTENT]", chrome.runtime.lastError.message);
        // N'afficher la bannière inconnu que si c'est le retry (ou erreur réseau grave)
        if (isRetry) afficherBanniere("inconnu", null);
        return;
      }
      if (!response) {
        if (isRetry) afficherBanniere("inconnu", null);
        return;
      }

      console.log("📥 [CONTENT] Réponse :", JSON.stringify(response));

      const info = {
        studioName:  studioNormalized,
        codePays:    response.codePays    || null,
        countryName: response.countryName || null
      };

      if (response.isEuropean === null || response.isEuropean === undefined) {
        // Studio inconnu : n'afficher la bannière que si c'est le retry
        if (isRetry) {
          afficherBanniere("inconnu", info);
        } else {
          console.log("[CONTENT] Studio inconnu — en attente du retry avant affichage.");
        }
      } else if (response.isEuropean) {
        afficherBanniere("valid", info);
      } else {
        afficherBanniere("invalid", info);
      }
    }
  );
}

// ── Boucle de détection ───────────────────────────────────────────────────
function tryDetect(isRetry = false) {
  if (!isGamePage) return;
  if (isDetecting) return;
  isDetecting = true;

  const MAX_ATTEMPTS = (isIGGamePage || isSteamDBGamePage || isRetry) ? 40 : 20;
  let attempts = 0;

  function loop() {
    attempts++;
    console.log(`🔄 [CONTENT] Tentative ${attempts}/${MAX_ATTEMPTS} (retry=${isRetry})...`);
    const studioRaw = detectStudio();
    if (studioRaw) {
      isDetecting = false;
      envoyerStudio(studioRaw, isRetry);
    } else if (attempts < MAX_ATTEMPTS) {
      setTimeout(loop, 500);
    } else {
      isDetecting = false;
      console.warn("[CONTENT] Studio introuvable après", MAX_ATTEMPTS, "tentatives");
      // N'afficher la bannière inconnu que si c'est le retry
      if (isRetry) afficherBanniere("inconnu", null);
    }
  }

  loop();
}

// ── Démarrage ─────────────────────────────────────────────────────────────
if (isGamePage) {
  const siteKey = isSteamGamePage ? "banshee_site_steam"
                : isIGGamePage    ? "banshee_site_ig"
                :                   "banshee_site_steamdb";

  chrome.storage.local.get([siteKey], (settings) => {
    if (settings[siteKey] === false) {
      console.log(`[CONTENT] Extension désactivée pour ce site (${siteKey}).`);
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => tryDetect(false));
    } else {
      tryDetect(false);
    }
  });
} else {
  console.log(`🚫 [CONTENT] Pas une page de jeu — extension inactive.`);
}

// ── Listener retryDetection ───────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "retryDetection") {
    console.log("🔄 [CONTENT] Retry immédiat depuis popup...");

    const siteKey = isSteamGamePage ? "banshee_site_steam"
                  : isIGGamePage    ? "banshee_site_ig"
                  :                   "banshee_site_steamdb";

    chrome.storage.local.get([siteKey], (settings) => {
      if (settings[siteKey] === false) {
        console.log(`[CONTENT] Retry annulé — extension désactivée pour ce site.`);
        return;
      }
      const old = document.querySelector(".banshee-wrap");
      if (old) old.remove();
      isDetecting = false;
      tryDetect(true);
    });

    sendResponse({ status: "retrying" });
    return true;
  }
});
