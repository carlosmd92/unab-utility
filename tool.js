/* ============================================================
   Consulta de Horarios UNAB — panel inyectable (bookmarklet)
   Se ejecuta DENTRO de una página de Banner (ssb8.unab.cl), así
   que todas las solicitudes son same-origin y no las bloquea ORDS.
   La búsqueda usa el endpoint público p_get_crse_unsec (verificado).
   ============================================================ */
(function () {
  "use strict";

  // Solo funciona dentro de Banner (same-origin)
  if (!/ssb8\.unab\.cl$/.test(location.hostname)) {
    alert("Abre primero cualquier página de Banner (ssb8.unab.cl) y luego usa el marcador.");
    return;
  }

  // Si ya está, alternar visibilidad
  var ya = document.getElementById("unab-util-panel");
  if (ya) { ya.style.display = (ya.style.display === "none" ? "block" : "none"); return; }

  var KEY = "unab_horarios_last";
  var $ = function (id) { return document.getElementById(id); };
  var uniq = function (a) { return Array.from(new Set(a)); };
  var splitExtras = function (v) { return (v || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean); };
  function validarTerm(t) { if (!/^\d{6}$/.test(t)) throw new Error("Período debe tener 6 dígitos, ej: 202620"); }

  // ---- estilos (prefijados uu- para no chocar con Banner) ----
  var css =
    "#unab-util-panel{position:fixed;top:8px;right:8px;z-index:2147483647;width:360px;max-width:calc(100vw - 16px);max-height:92vh;overflow:auto;" +
    "background:#fff;border:1px solid #888;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,.25);" +
    "font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;font-size:13px;line-height:1.3;color:#111;}" +
    "#unab-util-panel *{box-sizing:border-box;}" +
    "#unab-util-panel .uu-head{display:flex;justify-content:space-between;align-items:center;background:#0b3d75;color:#fff;" +
    "padding:8px 10px;border-radius:10px 10px 0 0;cursor:move;}" +
    "#unab-util-panel .uu-head b{font-size:14px;}" +
    "#unab-util-panel .uu-x{cursor:pointer;font-size:18px;line-height:1;padding:0 4px;}" +
    "#unab-util-panel .uu-body{padding:10px;}" +
    "#unab-util-panel fieldset{border:1px solid #ccc;border-radius:8px;padding:8px;margin:0 0 10px;}" +
    "#unab-util-panel legend{font-weight:600;padding:0 4px;}" +
    "#unab-util-panel label{display:block;margin:4px 0 2px;}" +
    "#unab-util-panel input,#unab-util-panel select{font:inherit;padding:3px 5px;width:100%;}" +
    "#unab-util-panel .uu-chk{display:flex;gap:4px 10px;flex-wrap:wrap;margin:3px 0;}" +
    "#unab-util-panel .uu-chk label{display:inline-flex;gap:4px;align-items:center;margin:0;white-space:nowrap;width:auto;}" +
    "#unab-util-panel .uu-chk input{width:auto;}" +
    "#unab-util-panel .uu-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}" +
    "#unab-util-panel button.uu-btn{font:inherit;padding:6px 8px;margin:4px 4px 0 0;cursor:pointer;" +
    "background:#0b3d75;color:#fff;border:none;border-radius:6px;}" +
    "#unab-util-panel button.uu-btn.sec{background:#e7edf5;color:#0b3d75;}" +
    "#unab-util-panel small{display:block;opacity:.7;margin-top:2px;}";
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // ---- UI ----
  var panel = document.createElement("div");
  panel.id = "unab-util-panel";
  panel.innerHTML =
    '<div class="uu-head"><b>Consulta de Horarios UNAB</b><span class="uu-x" title="Cerrar">&times;</span></div>' +
    '<div class="uu-body">' +

      '<fieldset><legend>Horarios (búsqueda combinada)</legend>' +
        '<label>Período (term_in)</label><input id="uu_term" value="202620">' +
        '<label>Materias</label>' +
        '<div class="uu-chk" id="uu_subj">' +
          '<label><input type="checkbox" value="LQUI" checked>LQUI</label>' +
          '<label><input type="checkbox" value="QUI" checked>QUI</label>' +
          '<label><input type="checkbox" value="QUIM" checked>QUIM</label>' +
          '<label><input type="checkbox" value="TQUI" checked>TQUI</label>' +
        '</div>' +
        '<label>Materias extra (coma)</label><input id="uu_subj_extra" placeholder="EJ: QUM1,QUM2">' +
        '<label>Campus</label>' +
        '<div class="uu-chk" id="uu_camp">' +
          '<label><input type="checkbox" value="BEL" checked>BEL</label>' +
          '<label><input type="checkbox" value="CAS">CAS</label>' +
          '<label><input type="checkbox" value="CON">CON</label>' +
          '<label><input type="checkbox" value="RAN">RAN</label>' +
          '<label><input type="checkbox" value="REP">REP</label>' +
          '<label><input type="checkbox" value="VIN">VIN</label>' +
        '</div>' +
        '<label>Campus extra (coma)</label><input id="uu_camp_extra" placeholder="EJ: XXX,YYY">' +
        '<label>Tipo (sel_schd)</label>' +
        '<select id="uu_schd">' + tipoOpciones("TEO") + '</select>' +
        '<button class="uu-btn" id="uu_buscar">Buscar combinada</button>' +
      '</fieldset>' +

      '<fieldset><legend>Ver curso puntual</legend>' +
        '<div class="uu-grid">' +
          '<div><label>Período</label><input id="uu_cterm" value="202620"></div>' +
          '<div><label>Materia</label><input id="uu_csubj" value="QUIM"></div>' +
          '<div><label>Curso</label><input id="uu_ccode" placeholder="EJ: 300" inputmode="numeric"></div>' +
          '<div><label>Campus</label><select id="uu_ccamp">' +
            '<option value="%">(todos)</option><option>BEL</option><option>CAS</option>' +
            '<option>CON</option><option>RAN</option><option>REP</option><option>VIN</option>' +
          '</select></div>' +
        '</div>' +
        '<label>Tipo</label><select id="uu_cschd">' + tipoOpciones("", true) + '</select>' +
        '<button class="uu-btn" id="uu_vcurso">Buscar curso</button>' +
        '<button class="uu-btn sec" id="uu_vcat">Abrir catálogo</button>' +
      '</fieldset>' +

      '<fieldset><legend>Herramientas docente</legend>' +
        '<div class="uu-grid">' +
          '<div><label>Período (term)</label><input id="uu_dterm" value="202620"></div>' +
          '<div><label>CRN</label><input id="uu_dcrn" placeholder="EJ: 3647" inputmode="numeric"></div>' +
        '</div>' +
        '<button class="uu-btn sec" id="uu_dhor">Horario docente</button>' +
        '<button class="uu-btn sec" id="uu_dlista">Lista de clases</button>' +
        '<button class="uu-btn sec" id="uu_dlibro">Libro de calificaciones</button>' +
        '<button class="uu-btn sec" id="uu_dhist">Historial de asignaturas</button>' +
        '<small>Horario e historial usan el período. Lista y libro además usan el CRN.</small>' +
      '</fieldset>' +

      '<button class="uu-btn sec" id="uu_mem">Borrar memoria</button>' +
    '</div>';
  document.body.appendChild(panel);

  function tipoOpciones(sel, conTodos) {
    var tipos = ["AYU", "CHA", "CLI", "DEP", "LAB", "PRA", "SEM", "TAL", "TEO", "TP"];
    var html = conTodos ? '<option value="">(todos)</option>' : '<option value="%"' + (sel === "%" ? " selected" : "") + '>%</option>';
    tipos.forEach(function (t) { html += '<option' + (t === sel ? " selected" : "") + ">" + t + "</option>"; });
    return html;
  }

  // ---- lógica de búsqueda (POST same-origin a p_get_crse_unsec) ----
  function buscar(term, materias, campuses, schd, crse) {
    var f = document.createElement("form");
    f.method = "post";
    f.action = "/PROD/bwckschd.p_get_crse_unsec";
    f.target = "_blank";
    function add(n, v) { var i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); }
    add("term_in", term);
    ["sel_subj", "sel_day", "sel_schd", "sel_insm", "sel_camp", "sel_levl",
     "sel_sess", "sel_instr", "sel_ptrm", "sel_attr"].forEach(function (n) { add(n, "dummy"); });
    materias.forEach(function (m) { add("sel_subj", m); });
    add("sel_crse", crse || ""); add("sel_title", "");
    add("sel_schd", schd || "%"); add("sel_insm", "%");
    add("sel_from_cred", ""); add("sel_to_cred", "");
    (campuses && campuses.length ? campuses : ["%"]).forEach(function (c) { add("sel_camp", c); });
    add("sel_levl", "%"); add("sel_ptrm", "%"); add("sel_instr", "%");
    add("sel_sess", "%"); add("sel_attr", "%");
    add("begin_hh", "0"); add("begin_mi", "0"); add("begin_ap", "a");
    add("end_hh", "0"); add("end_mi", "0"); add("end_ap", "a");
    document.body.appendChild(f); f.submit(); f.remove();
  }

  function chks(id) { return Array.prototype.map.call($(id).querySelectorAll("input:checked"), function (e) { return e.value; }); }
  function abrir(url) { window.open(url, "_blank"); }

  // ---- wiring ----
  $("uu_buscar").onclick = function () {
    try {
      var term = $("uu_term").value.trim(); validarTerm(term);
      var materias = uniq(chks("uu_subj").concat(splitExtras($("uu_subj_extra").value)));
      if (!materias.length) throw new Error("Selecciona o ingresa al menos una materia.");
      var campus = uniq(chks("uu_camp").concat(splitExtras($("uu_camp_extra").value)));
      if (!campus.length) throw new Error("Selecciona o ingresa al menos un campus.");
      buscar(term, materias, campus, $("uu_schd").value || "%", "");
      saveMem();
    } catch (e) { alert(e.message || e); }
  };

  $("uu_vcurso").onclick = function () {
    try {
      var term = $("uu_cterm").value.trim(); validarTerm(term);
      var subj = $("uu_csubj").value.trim().toUpperCase();
      var crse = $("uu_ccode").value.trim();
      if (!subj) throw new Error("Materia requerida.");
      if (!crse) throw new Error("Código de curso requerido.");
      buscar(term, [subj], [$("uu_ccamp").value || "%"], $("uu_cschd").value || "%", crse);
    } catch (e) { alert(e.message || e); }
  };

  $("uu_vcat").onclick = function () {
    try {
      var term = $("uu_cterm").value.trim(); validarTerm(term);
      var subj = $("uu_csubj").value.trim().toUpperCase();
      var crse = $("uu_ccode").value.trim();
      if (!subj) throw new Error("Materia requerida.");
      if (!crse) throw new Error("Código de curso requerido.");
      var q = new URLSearchParams({ term_in: term, subj_in: subj, crse_in: crse, schd_in: $("uu_cschd").value || "" });
      abrir("/PROD/bwckctlg.p_disp_listcrse?" + q.toString());
    } catch (e) { alert(e.message || e); }
  };

  $("uu_dhor").onclick = function () {
    try { var t = $("uu_dterm").value.trim(); validarTerm(t); abrir("/PROD/bwlkifac.P_FacSched?" + new URLSearchParams({ term: t })); }
    catch (e) { alert(e.message || e); }
  };
  $("uu_dlista").onclick = function () {
    try {
      var t = $("uu_dterm").value.trim(); validarTerm(t);
      var crn = $("uu_dcrn").value.trim(); if (!crn) throw new Error("CRN requerido.");
      abrir("/PROD/bwlkfcwl.P_FacClaListSum?" + new URLSearchParams({ term: t, crn: crn }));
    } catch (e) { alert(e.message || e); }
  };
  $("uu_dlibro").onclick = function () {
    try {
      var t = $("uu_dterm").value.trim(); validarTerm(t);
      var crn = $("uu_dcrn").value.trim(); if (!crn) throw new Error("CRN requerido.");
      abrir("/PROD/bwlkegrb.P_FacGradeComponents?" + new URLSearchParams({ term: t, crn: crn }));
    } catch (e) { alert(e.message || e); }
  };
  $("uu_dhist").onclick = function () { abrir("/PROD/bwlkasgn.P_FacAssignHist"); };

  $("uu_mem").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} alert("Memoria borrada."); };
  panel.querySelector(".uu-x").onclick = function () { panel.style.display = "none"; };

  // ---- memoria mínima del bloque Horarios ----
  function saveMem() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        term: $("uu_term").value.trim(),
        subj: chks("uu_subj"), subjX: $("uu_subj_extra").value,
        camp: chks("uu_camp"), campX: $("uu_camp_extra").value,
        schd: $("uu_schd").value
      }));
    } catch (e) {}
  }
  function loadMem() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (!o) return;
      if (o.term) $("uu_term").value = o.term;
      if (o.schd) $("uu_schd").value = o.schd;
      if (o.subjX != null) $("uu_subj_extra").value = o.subjX;
      if (o.campX != null) $("uu_camp_extra").value = o.campX;
      if (Array.isArray(o.subj)) { var s = new Set(o.subj); $("uu_subj").querySelectorAll("input").forEach(function (c) { c.checked = s.has(c.value); }); }
      if (Array.isArray(o.camp)) { var c2 = new Set(o.camp); $("uu_camp").querySelectorAll("input").forEach(function (c) { c.checked = c2.has(c.value); }); }
    } catch (e) {}
  }
  loadMem();

  // ---- arrastrar el panel por el encabezado ----
  (function () {
    var head = panel.querySelector(".uu-head"), down = false, ox = 0, oy = 0;
    head.addEventListener("mousedown", function (e) {
      if (e.target.classList.contains("uu-x")) return;
      down = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!down) return;
      panel.style.left = (e.clientX - ox) + "px";
      panel.style.top = (e.clientY - oy) + "px";
      panel.style.right = "auto";
    });
    document.addEventListener("mouseup", function () { down = false; });
  })();
})();
