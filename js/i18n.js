/* Shared bilingual layer: localStorage "stationLang", [data-ru]/[data-en],
   #btnLang wiring and a window.STS API consumed by page scripts. */
(function () {
  "use strict";
  var lang = "ru";
  try { var s = localStorage.getItem("stationLang"); if (s === "ru" || s === "en") lang = s; } catch (e) {}

  function apply() {
    document.querySelectorAll("[data-ru]").forEach(function (el) {
      el.innerHTML = lang === "ru" ? el.getAttribute("data-ru") : el.getAttribute("data-en");
    });
    document.documentElement.lang = lang;
    var b = document.getElementById("btnLang");
    if (b) b.textContent = lang === "ru" ? "EN" : "RU";
  }

  function setLang(l) {
    lang = l === "en" ? "en" : "ru";
    try { localStorage.setItem("stationLang", lang); } catch (e) {}
    apply();
    window.dispatchEvent(new CustomEvent("sts:lang", { detail: { lang: lang } }));
  }

  window.STS = {
    get lang() { return lang; },
    tr: function (ru, en) { return lang === "ru" ? ru : en; },
    setLang: setLang,
    apply: apply
  };

  var btn = document.getElementById("btnLang");
  if (btn) btn.onclick = function () { setLang(lang === "ru" ? "en" : "ru"); };
  apply();
})();