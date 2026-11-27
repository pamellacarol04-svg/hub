// 5 · Academic & Learning: courses with a syllabus tracker, spaced-repetition flashcards, Cornell
// notes and a certificate archive.  6 · Health & Fitness: a progressive-overload lift logger, cardio,
// a macro and calorie tracker, body measurements, a step counter and a private progress gallery.
import { S, esc, icon, ACTIONS, FORMS, BINDS, rerender, fail, toast, today, addDays, parseDay, DAYS, MONTHS, fmtShort, fmtLong, daysBetween, plural, round2 } from '../core.js';
import { items, byId, save, saveMany, patch, dget, sortBy, addBtn, CARDIO_KINDS, MEAL_SLOTS, ANGLES, normalizeHexColor } from '../kinds.js';
import { photosOf, img, isPdf } from '../photos.js';
import { barChart, lineChart, ring } from '../ui.js';
import { GROUPS } from './lightbox.js';
import { D, saveData, card, hubHead, folderTabs, pickTab, emptyNote, photoDrop, label, meter, sparkleWin, bigWin, seg, pin, binder, twoCol, polaroid } from './common.js';
import * as C from '../hub.js';

// =====================================================================
// 5 · Academic & Learning
// =====================================================================
const LTABS = [['courses', 'Cursos'], ['cards', 'Flashcards'], ['notes', 'Notas Cornell'], ['certs', 'Certificados'], ['study', 'Tempo de estudo']];
const STUDY_HEAT_LABELS = ['Sem estudo', '1 a 29 min', '30 a 59 min', '60 a 119 min', '120 a 179 min', '180 a 239 min', '240 min ou mais'];
const STUDY_HEAT_COLOR_DEFAULTS = ['#E6E5E3', '#D5DFEA', '#B8CEE1', '#9DB8D7', '#82A5CD', '#5E8DC1', '#3B74B5'];
const STUDY_IMPORT_FORMAT = 'hub-study-sessions-v1';
const SYLLABUS_IMPORT_FORMAT = 'hub-course-syllabus-v1';
const JSON_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
const JSON_IMPORT_MAX_ENTRIES = 1000;
ACTIONS['syl-step'] = async (b) => { const x = byId(b.dataset.id); if (!x) return; const st = C.stepsOf(x); const i = Number(b.dataset.i); st[i] = { ...st[i], done: !st[i].done }; try { await patch(x, { data: { steps: st } }); if (st.every(s => s.done)) bigWin(`${x.title}: grade curricular concluída.`); rerender(); } catch (e) { fail(e); } };
ACTIONS['syllabus-import-open'] = (button) => {
  const course = byId(button.dataset.id);
  if (!course || course.kind !== 'course') { fail(new Error('Selecione um curso válido para importar a grade curricular.')); return; }
  const input = document.getElementById('course-syllabus-import-file');
  if (!input) { fail(new Error('Não foi possível abrir o campo para selecionar o arquivo JSON.')); return; }
  input.dataset.courseId = course.id;
  input.click();
};
BINDS['syllabus-import-file'] = async (input, type) => {
  if (type !== 'change') return;
  const file = input.files?.[0];
  const courseId = input.dataset.courseId;
  delete input.dataset.courseId;
  input.value = '';
  if (!file) return;
  try {
    if (!courseId) throw new Error('Selecione um curso antes de importar a grade curricular.');
    if (file.size > JSON_IMPORT_MAX_BYTES) throw new Error('O arquivo JSON deve ter no máximo 2 MB.');
    const payload = JSON.parse(await file.text());
    if (payload?.format !== SYLLABUS_IMPORT_FORMAT || !Array.isArray(payload.steps)) {
      throw new Error('Formato inválido. Use o modelo JSON da grade curricular.');
    }
    if (!payload.steps.length) { toast('O arquivo não contém etapas para importar.'); return; }
    if (payload.steps.length > JSON_IMPORT_MAX_ENTRIES) throw new Error('A grade pode conter no máximo 1.000 etapas.');
    const steps = payload.steps.map((step, index) => {
      if (typeof step !== 'string') throw new Error(`Etapa ${index + 1}: informe o nome como texto.`);
      const title = step.trim();
      if (!title || title.length > 300) throw new Error(`Etapa ${index + 1}: o nome deve ter entre 1 e 300 caracteres.`);
      return { t: title, done: false };
    });
    const course = byId(courseId);
    if (!course || course.kind !== 'course') throw new Error('O curso selecionado não está mais disponível.');
    await patch(course, { data: { steps: [...C.stepsOf(course), ...steps] } });
    toast(`${plural(steps.length, 'etapa', 'etapas')} adicionadas à grade de ${course.title}; o progresso existente foi preservado.`);
    rerender();
  } catch (e) { fail(e); }
};
function syllabusTimerControls(course, step, index) {
  const timer = S.ui.studyTimer;
  const active = timer?.courseId === course.id && timer.stepIndex === index;
  const preset = esc(JSON.stringify({ title: step.t, day: today(), cat: 'sky', data: { start: '09:00', end: '10:00' } }));
  const addBlock = `<button type="button" class="icon-btn study-step-block" data-action="add" data-kind="block" data-preset="${preset}" aria-label="Adicionar ${esc(step.t)} como bloco de tempo à agenda" title="Adicionar bloco de tempo">${icon('plus')}</button>`;
  if (active) {
    const action = timer.startedAt ? 'pause' : 'resume';
    const label = timer.startedAt ? 'Pausar' : 'Continuar';
    return `<span class="study-step-controls"><span class="study-step-clock">${clockText(studyElapsed(timer))}</span><button class="icon-btn" data-action="study-timer" data-v="${action}" aria-label="${label} cronômetro: ${esc(step.t)}" title="${label}">${icon(timer.startedAt ? 'pause' : 'play')}</button><button class="icon-btn study-step-stop" data-action="study-timer" data-v="stop" aria-label="Parar e salvar: ${esc(step.t)}" title="Parar e salvar">${icon('stop')}</button>${addBlock}</span>`;
  }
  return `<span class="study-step-controls"><button class="icon-btn" data-action="study-timer" data-v="start" data-course="${esc(course.id)}" data-step="${index}" data-lesson="${esc(step.t)}" aria-label="Iniciar cronômetro: ${esc(step.t)}" title="Iniciar cronômetro" ${timer ? 'disabled' : ''}>${icon('play')}</button>${addBlock}</span>`;
}
function tabCourses() {
  const l = sortBy(items('course'), c => (C.syllabusPct(c) >= 1 ? 1 : 0) * 1e9 + (c.day ? daysBetween(today(), c.day) : 9e8));
  return `<div class="okr-bar">${addBtn('course', 'Curso', { cls: 'sm' })}<span class="small muted">${plural(l.filter(c => C.syllabusPct(c) < 1).length, 'curso')} em andamento</span><a class="btn sm ghost" href="./course-syllabus-template.json" download>Baixar modelo JSON</a></div>
  <div class="course-grid">${l.map(c => { const st = C.stepsOf(c); const p = C.syllabusPct(c); const notes = items('cnote').filter(n => n.parent_id === c.id).length; const decks = items('deck').filter(d => d.parent_id === c.id); const due = decks.reduce((a, d) => a + C.dueCards(d.id).length, 0); const color = normalizeHexColor(dget(c, 'color')); const progressColor = normalizeHexColor(dget(c, 'progressColor'));
    return `<article class="course card lined" ${color ? `style="--course-color:${color}"` : ''}>${binder()}<header><span class="kick">${esc(dget(c, 'code') || 'Curso')}${dget(c, 'teacher') ? ` · ${esc(dget(c, 'teacher'))}` : ''}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(c.id)}">${esc(c.title)}</button></h3></header>
      <div class="reset-row">${meter(p, 'c1', 'Grade curricular', progressColor)}<small>${Math.round(p * 100)}%</small></div><ol class="syllabus">${st.map((s, i) => `<li><button class="cb ${s.done ? 'on' : ''}" data-action="syl-step" data-id="${esc(c.id)}" data-i="${i}" aria-pressed="${s.done}">${icon('check')}<span>${esc(s.t)}</span></button>${syllabusTimerControls(c, s, i)}</li>`).join('')}</ol>
      <p class="small muted">${c.day ? `Termina em ${esc(fmtShort(c.day))} · ` : ''}<a href="#/learn?tab=notes">${plural(notes, 'nota', 'notas')}</a> · <a href="#/learn?tab=cards">${plural(due, 'cartão pendente', 'cartões pendentes')}</a>${c.url ? ` · <a href="${esc(c.url)}" target="_blank" rel="noopener">Abrir</a>` : ''}</p><button class="btn sm ghost" data-action="syllabus-import-open" data-id="${esc(c.id)}">Importar grade</button></article>`; }).join('') || emptyNote('O que você está aprendendo agora?')}
  <input class="sr-only" type="file" id="course-syllabus-import-file" accept=".json,application/json" data-bind="syllabus-import-file" tabindex="-1"></div>`;
}
// Flashcards (Leitner boxes)
ACTIONS['study'] = (b) => { S.ui.study = b.dataset.v; S.ui.flip = false; rerender(); };
ACTIONS['flip'] = () => { S.ui.flip = !S.ui.flip; rerender(); };
let studyClockInterval = null;
const studyElapsed = (timer) => (Number(timer?.elapsedMs) || 0) + (timer?.startedAt ? Date.now() - timer.startedAt : 0);
const clockText = (ms) => {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
const studyTimeText = (minutes) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
};
function startStudyClock() {
  clearInterval(studyClockInterval);
  studyClockInterval = setInterval(() => {
    const timer = S.ui.studyTimer;
    if (!timer?.startedAt) { clearInterval(studyClockInterval); studyClockInterval = null; return; }
    const display = document.getElementById('study-clock');
    if (display) display.textContent = clockText(studyElapsed(timer));
    document.querySelectorAll('.study-step-clock').forEach(clock => { clock.textContent = clockText(studyElapsed(timer)); });
  }, 1000);
}
function stopStudyClock() { clearInterval(studyClockInterval); studyClockInterval = null; }
ACTIONS['study-timer'] = async (b) => {
  const action = b.dataset.v;
  const timer = S.ui.studyTimer;
  if (action === 'start') {
    if (timer) { toast('Finalize a sessão atual antes de iniciar outra.', { error: true }); return; }
    const lessonTitle = (b.dataset.lesson || document.getElementById('study-lesson')?.value || '').trim();
    if (!lessonTitle) { toast('Informe o nome da aula para iniciar.', { error: true }); return; }
    S.ui.studyTimer = {
      startedAt: Date.now(), elapsedMs: 0, day: today(),
      courseId: b.dataset.course || document.getElementById('study-course')?.value || '',
      stepIndex: b.dataset.step === undefined ? null : Number(b.dataset.step),
      lessonTitle,
    };
    rerender(); startStudyClock(); return;
  }
  if (!timer) return;
  if (action === 'pause') {
    timer.elapsedMs = studyElapsed(timer); timer.startedAt = null; stopStudyClock(); rerender(); return;
  }
  if (action === 'resume') {
    timer.startedAt = Date.now(); rerender(); startStudyClock(); return;
  }
  if (action === 'finish' || action === 'stop') {
    if (timer.saving) return;
    timer.saving = true;
    const minutes = Math.max(1, Math.round(studyElapsed(timer) / 60000));
    const course = timer.courseId && byId(timer.courseId);
    let completedCourse = null;
    try {
      if (course && Number.isInteger(timer.stepIndex)) {
        const steps = C.stepsOf(course);
        const step = steps[timer.stepIndex];
        if (step && !step.done) {
          steps[timer.stepIndex] = { ...step, done: true };
          await patch(course, { data: { steps } });
          if (steps.every(item => item.done)) completedCourse = course;
        }
      }
      await save({ kind: 'study', title: timer.lessonTitle || course?.title || 'Estudo livre', day: timer.day || today(), num: minutes, parent_id: course?.id || null });
      if (completedCourse) bigWin(`${completedCourse.title}: grade curricular concluída.`);
      S.ui.studyTimer = null; stopStudyClock(); toast(`${studyTimeText(minutes)} de estudo registrados.`); rerender();
    } catch (e) { timer.saving = false; fail(e); }
  }
};
ACTIONS['study-year'] = (b) => {
  S.ui.studyYear = b.dataset.v === '0' ? null : (Number(S.ui.studyYear) || C.year()) + Number(b.dataset.v);
  rerender();
};
ACTIONS['study-import-open'] = () => {
  const input = document.getElementById('study-import-file');
  if (!input) { fail(new Error('Não foi possível abrir o campo para selecionar o arquivo JSON.')); return; }
  input.click();
};
BINDS['study-heat-color'] = async (input, type) => {
  if (type !== 'change') return;
  const level = Number(input.dataset.level);
  const color = normalizeHexColor(input.value);
  if (!Number.isInteger(level) || level < 0 || level >= STUDY_HEAT_LABELS.length || !color) {
    toast('Selecione uma cor válida.', { error: true }); return;
  }
  await saveData({ studyHeatColors: { ...(D().studyHeatColors || {}), [level]: color } });
  rerender();
};
BINDS['study-import-file'] = async (input, type) => {
  if (type !== 'change') return;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    if (file.size > JSON_IMPORT_MAX_BYTES) throw new Error('O arquivo JSON deve ter no máximo 2 MB.');
    const payload = JSON.parse(await file.text());
    if (payload?.format !== STUDY_IMPORT_FORMAT || !Array.isArray(payload.sessions)) {
      throw new Error('Formato inválido. Use o modelo JSON de tempo de estudo.');
    }
    if (payload.sessions.length > JSON_IMPORT_MAX_ENTRIES) throw new Error('O arquivo pode conter no máximo 1.000 sessões.');
    if (!payload.sessions.length) { toast('O arquivo não contém sessões para importar.'); return; }
    const courses = new Map(items('course').map(course => [String(course.title || '').trim().toLowerCase(), course]));
    let unlinkedCourses = 0;
    const rows = payload.sessions.map((session, index) => {
      const rowNumber = index + 1;
      if (!session || typeof session !== 'object' || Array.isArray(session)) throw new Error(`Sessão ${rowNumber}: registro inválido.`);
      const date = session.date;
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Sessão ${rowNumber}: informe a data no formato AAAA-MM-DD.`);
      const parsedDate = parseDay(date);
      if (parsedDate.getFullYear() !== Number(date.slice(0, 4)) || parsedDate.getMonth() + 1 !== Number(date.slice(5, 7)) || parsedDate.getDate() !== Number(date.slice(8, 10))) {
        throw new Error(`Sessão ${rowNumber}: a data não existe no calendário.`);
      }
      const lesson = typeof session.lesson === 'string' ? session.lesson.trim() : '';
      if (!lesson || lesson.length > 300) throw new Error(`Sessão ${rowNumber}: o nome da aula deve ter entre 1 e 300 caracteres.`);
      if (!Number.isInteger(session.minutes) || session.minutes < 1 || session.minutes > 1440) {
        throw new Error(`Sessão ${rowNumber}: os minutos devem ser um número inteiro entre 1 e 1.440.`);
      }
      if (session.course != null && typeof session.course !== 'string') throw new Error(`Sessão ${rowNumber}: o curso deve ser um texto ou ficar vazio.`);
      const courseName = String(session.course || '').trim();
      if (courseName.length > 300) throw new Error(`Sessão ${rowNumber}: o nome do curso deve ter no máximo 300 caracteres.`);
      const course = courseName ? courses.get(courseName.toLowerCase()) : null;
      if (courseName && !course) unlinkedCourses++;
      return {
        kind: 'study', title: lesson, day: date, num: session.minutes, parent_id: course?.id || null,
        ...(courseName && !course ? { data: { importedCourse: courseName } } : {}),
      };
    });
    await saveMany(rows);
    toast(`${plural(rows.length, 'sessão', 'sessões')} importadas.${unlinkedCourses ? ` ${plural(unlinkedCourses, 'Curso não vinculado', 'Cursos não vinculados')}.` : ''}`);
    rerender();
  } catch (e) { fail(e); }
};
ACTIONS['grade'] = async (b) => { const c = byId(b.dataset.id); if (!c) return; const box = Number(dget(c, 'box')) || 1; const g = b.dataset.v; const nb = g === 'again' ? 1 : g === 'hard' ? box : Math.min(5, box + 1); const due = g === 'again' ? today() : addDays(today(), g === 'hard' ? 1 : C.BOX_DAYS[nb]);
  try { await patch(c, { data: { box: nb, due, seen: (Number(dget(c, 'seen')) || 0) + 1 } }); S.ui.flip = false; S.ui.studied = (S.ui.studied || 0) + 1; if (g === 'again') S.ui.skip = [...(S.ui.skip || []), c.id]; rerender(); } catch (e) { fail(e); } };
function tabCards() {
  const decks = items('deck'); const st = S.ui.study;
  if (st) { const queue = C.dueCards(st === 'all' ? null : st).filter(c => !(S.ui.skip || []).includes(c.id)); const c = queue[0]; const deck = st !== 'all' && byId(st);
    return `<div class="wk-bar"><button class="btn sm ghost" data-action="study" data-v="">${icon('back')} Todos os baralhos</button><b>${esc(deck ? deck.title : 'Tudo pendente')}</b><span class="right small muted">${plural(queue.length, 'cartão', 'cartões')} restantes</span></div>
    ${c ? `<div class="flash-stage"><article class="flash ${S.ui.flip ? 'flipped' : ''}">${pin()}<span class="kick">Caixa ${Number(dget(c, 'box')) || 1} de 5</span><p class="fl-q">${esc(c.title)}</p>${S.ui.flip ? `<hr><p class="fl-a">${esc(c.body || '(sem resposta)')}</p>` : ''}</article>
      ${S.ui.flip ? `<div class="grades"><button class="btn" data-action="grade" data-id="${esc(c.id)}" data-v="again">De novo</button><button class="btn" data-action="grade" data-id="${esc(c.id)}" data-v="hard">Difícil <small>amanhã</small></button><button class="btn solid" data-action="grade" data-id="${esc(c.id)}" data-v="good">Acertei <small>em ${plural(C.BOX_DAYS[Math.min(5, (Number(dget(c, 'box')) || 1) + 1)], 'dia', 'dias')}</small></button></div>` : `<button class="btn solid block-c" data-action="flip">Mostrar resposta</button>`}</div>`
      : `<div class="flash-stage done">${label('Tudo em dia', 'butter')}<p class="lede">Não há mais cartões pendentes${S.ui.studied ? `. Você revisou ${plural(S.ui.studied, 'cartão', 'cartões')}` : ''}. Eles voltarão quando estiver perto de você esquecer.</p></div>`}`; }
  const boxes = [1, 2, 3, 4, 5].map(b => items('flash').filter(c => (Number(dget(c, 'box')) || 1) === b).length);
  return `<div class="okr-bar"><button class="btn sm solid" data-action="study" data-v="all" ${C.dueCards().length ? '' : 'disabled'}>${icon('brain')} Estudar tudo pendente (${C.dueCards().length})</button>${addBtn('deck', 'Baralho', { cls: 'sm ghost' })}${addBtn('flash', 'Cartão', { cls: 'sm ghost' })}</div>
  <p class="small muted evergreen">${icon('repeat')} Repetição espaçada: um cartão que você sabe avança de caixa e volta mais tarde (1, 2, 4, 8 e 16 dias). Quando erra, volta para a caixa 1.</p>
  <div class="boxes">${boxes.map((n, i) => `<div class="lbox b${i + 1}"><b class="num">${n}</b><small>Box ${i + 1}</small></div>`).join('')}</div>
  <div class="deck-grid">${decks.map(d => { const all = items('flash').filter(c => c.parent_id === d.id); const due = C.dueCards(d.id).length; const crs = d.parent_id && byId(d.parent_id); const known = all.filter(c => (Number(dget(c, 'box')) || 1) >= 4).length;
    return `<article class="deck"><span class="deck-stack" aria-hidden="true"><i></i><i></i></span><div class="deck-face"><span class="kick">${esc(crs ? crs.title : 'Baralho')}</span><h3><button class="link-plain" data-action="edit" data-id="${esc(d.id)}">${esc(d.title)}</button></h3><p class="small">${plural(all.length, 'cartão', 'cartões')} · ${known} bem conhecidos</p>${meter(C.pctOf(known, all.length), 'c4')}<div class="inline"><button class="btn sm ${due ? 'solid' : ''}" data-action="study" data-v="${esc(d.id)}" ${due ? '' : 'disabled'}>Estudar ${due}</button>${addBtn('flash', 'Cartão', { cls: 'sm ghost', parent: d.id, preset: { parent_id: d.id, data: { box: 1 } } })}</div></div></article>`; }).join('') || emptyNote('Crie um baralho e adicione cartões a ele.')}</div>`;
}
ACTIONS['cn-open'] = (b) => { S.ui.cnote = S.ui.cnote === b.dataset.id ? null : b.dataset.id; rerender(); };
function tabNotes() {
  const l = sortBy(items('cnote'), n => n.day || '', -1); const open = S.ui.cnote && byId(S.ui.cnote) || l[0];
  return `<div class="notes-layout"><aside class="note-list">${addBtn('cnote', 'Nota Cornell', { cls: 'sm', preset: { day: today() } })}<ul>${l.map(n => { const c = n.parent_id && byId(n.parent_id); return `<li><button class="nl ${open?.id === n.id ? 'on' : ''}" data-action="cn-open" data-id="${esc(n.id)}"><b>${esc(n.title)}</b><small>${esc(c ? c.title : '')}${n.day ? ` · ${esc(fmtShort(n.day))}` : ''}</small></button></li>`; }).join('')}</ul></aside>
  ${open ? `<article class="cornell">${binder()}<header><span class="kick">${esc((open.parent_id && byId(open.parent_id)?.title) || 'Notas')} · ${esc(open.day ? fmtLong(open.day) : '')}</span><h2>${esc(open.title)}</h2><button class="btn sm ghost" data-action="edit" data-id="${esc(open.id)}">${icon('edit')} Editar</button></header>
    <div class="cn-grid"><div class="cn-cues"><h3>Perguntas-chave</h3><ul>${(dget(open, 'cues') || []).map(q => `<li>${esc(q)}</li>`).join('') || '<li class="muted">Perguntas vão aqui</li>'}</ul></div><div class="cn-notes"><h3>Anotações</h3><p>${esc(open.body || '')}</p></div></div>
    <div class="cn-sum"><h3>Resumo</h3><p>${esc(dget(open, 'summary') || 'Resuma em duas linhas, com suas próprias palavras.')}</p></div></article>` : emptyNote('Perguntas à esquerda, notas à direita e resumo na parte inferior.')}</div>`;
}
GROUPS.cert = () => items('cert').flatMap(c => photosOf(c.id)).filter(p => !isPdf(p));
function tabCerts() {
  const l = sortBy(items('cert'), c => c.day || '', -1);
  return `<div class="okr-bar">${addBtn('cert', 'Certificado', { cls: 'sm' })}<span class="small muted">${plural(l.length, 'certificado', 'certificados')} conquistados</span></div>
  <div class="cert-grid">${l.map((c, i) => { const p = photosOf(c.id)[0]; return `<article class="cert">${p && isPdf(p) ? `<button class="cert-pdf" data-action="photo-view" data-id="${esc(p.id)}">${img(p)}</button>` : polaroid(p, '', { group: 'cert', tilt: i % 2 ? 1.5 : -1.5, empty: photoDrop({ item: c.id, label: 'Adicionar certificado', icon: 'medal' }) })}<div class="cert-b"><h3><button class="link-plain" data-action="edit" data-id="${esc(c.id)}">${esc(c.title)}</button></h3><small class="muted">${esc(dget(c, 'issuer') || '')}${c.day ? ` · ${esc(fmtLong(c.day))}` : ''}</small>${c.url ? `<a class="small" href="${esc(c.url)}" target="_blank" rel="noopener">${icon('sealCheck')} Verificar</a>` : ''}</div></article>`; }).join('') || emptyNote('Todos os certificados, medalhas e diplomas em um só lugar.')}</div>`;
}
function tabStudy() {
  const y = Number(S.ui.studyYear) || C.year();
  const minutesByDay = C.studyMinutesByDay(y);
  const heatColors = Array.from({ length: STUDY_HEAT_LABELS.length }, (_, level) => {
    const savedColor = normalizeHexColor(D().studyHeatColors?.[level]);
    return { level, color: savedColor || STUDY_HEAT_COLOR_DEFAULTS[level], variable: savedColor ? `--study-heat-${level}:${savedColor}` : '' };
  });
  const heatColorVars = heatColors.map(color => color.variable).filter(Boolean).join(';');
  const heatColorPickers = heatColors.map(({ level, color }) => `<label class="study-heat-picker" title="${esc(STUDY_HEAT_LABELS[level])}"><input type="color" value="${esc(color)}" data-bind="study-heat-color" data-level="${level}" aria-label="Escolher cor: ${esc(STUDY_HEAT_LABELS[level])}"><i class="l${level}" aria-hidden="true"></i></label>`).join('');
  const days = Array.from({ length: C.daysInYear(y) }, (_, i) => addDays(`${y}-01-01`, i));
  const firstDayOffset = (parseDay(days[0]).getDay() + 6) % 7;
  const cells = [...Array(firstDayOffset).fill(null), ...days];
  const monthLabels = MONTHS.map((month, i) => {
    const day = `${y}-${String(i + 1).padStart(2, '0')}-01`;
    const column = Math.floor((firstDayOffset + C.dayOfYear(day) - 1) / 7) + 1;
    return `<span style="grid-column:${column}">${esc(month)}</span>`;
  }).join('');
  const heatCells = cells.map(day => {
    if (!day) return '<i class="pad"></i>';
    const minutes = Number(minutesByDay[day]) || 0;
    const level = minutes >= 240 ? 6 : minutes >= 180 ? 5 : minutes >= 120 ? 4 : minutes >= 60 ? 3 : minutes >= 30 ? 2 : minutes > 0 ? 1 : 0;
    const tip = `${fmtLong(day)}: ${studyTimeText(minutes)}`;
    return `<i class="l${level}" title="${esc(tip)}" aria-label="${esc(tip)}"></i>`;
  }).join('');
  const sessions = sortBy(items('study').filter(s => String(s.day || '').startsWith(`${y}-`)), s => `${s.day} ${s.created_at || ''}`, -1);
  const totalMinutes = Object.values(minutesByDay).reduce((total, minutes) => total + minutes, 0);
  const activeDays = Object.values(minutesByDay).filter(minutes => minutes > 0).length;
  const timer = S.ui.studyTimer;
  const clock = timer ? clockText(studyElapsed(timer)) : '00:00:00';
  const timerPanel = `<div class="study-clock" id="study-clock" aria-label="Tempo de estudo">${clock}</div>
    <label class="field"><span>Nome da aula</span><input class="input" id="study-lesson" maxlength="200" value="${esc(timer?.lessonTitle || '')}" placeholder="Ex.: Trauma Abdominal" ${timer ? 'readonly' : ''}></label>
    ${timer ? `<p class="small muted">${timer.startedAt ? 'Estudo em andamento' : 'Estudo pausado'}${timer.courseId ? ` · ${esc(byId(timer.courseId)?.title || 'Curso removido')}` : ' · Estudo livre'} · iniciado em ${esc(fmtLong(timer.day))}</p>
      <div class="inline">${timer.startedAt ? `<button class="btn" data-action="study-timer" data-v="pause">${icon('pause')} Pausar</button>` : `<button class="btn solid" data-action="study-timer" data-v="resume">${icon('play')} Continuar</button>`}<button class="btn solid" data-action="study-timer" data-v="stop">${icon('stop')} Parar e salvar</button></div>`
      : `<label class="field"><span>Curso (opcional)</span><select class="input" id="study-course"><option value="">Estudo livre</option>${items('course').map(course => `<option value="${esc(course.id)}">${esc(course.title)}</option>`).join('')}</select></label>
      <button class="btn solid" data-action="study-timer" data-v="start">${icon('play')} Iniciar estudo</button>`}`;
  const yearNav = `<div class="wk-bar"><button class="icon-btn" data-action="study-year" data-v="-1" aria-label="Ano anterior">${icon('back')}</button><b>${y}</b><button class="icon-btn" data-action="study-year" data-v="1" aria-label="Próximo ano">${icon('fwd')}</button>${y !== C.year() ? `<button class="btn sm ghost" data-action="study-year" data-v="0">Este ano</button>` : ''}<button class="btn sm ghost" data-action="study-import-open">Importar dados</button><a class="btn sm ghost" href="./study-heatmap-template.json" download>Baixar modelo JSON</a><input class="sr-only" type="file" id="study-import-file" accept=".json,application/json" data-bind="study-import-file" tabindex="-1"></div>`;
  return `${yearNav}<div class="tickets"><div class="ticket c1"><span class="kick">Tempo estudado</span><b class="num">${esc(studyTimeText(totalMinutes))}</b></div><div class="ticket c4"><span class="kick">Dias com estudo</span><b class="num">${activeDays}</b></div><div class="ticket c3"><span class="kick">Sessões</span><b class="num">${sessions.length}</b></div></div>
    ${twoCol(card(`Cronômetro de <em>estudo</em>`, timerPanel, { cls: 'lined study-timer-card' }),
      card(`Consistência em <em>${y}</em>`, `<div class="heat-wrap" ${heatColorVars ? `style="${heatColorVars}"` : ''}><div class="heat-months" aria-hidden="true">${monthLabels}</div><div class="heat-g" role="img" aria-label="Minutos de estudo por dia em ${y}">${heatCells}</div><div class="heat-key" aria-label="Escala de minutos estudados">Menos${heatColorPickers}Mais</div></div><p class="small muted">Cada quadrado representa um dia. Passe o cursor para ver o tempo registrado.</p>`, { cls: 'lined study-heatmap-card' }))}
    ${card(`Sessões <em>registradas</em>`, sessions.length ? `<ul class="rows">${sessions.slice(0, 12).map(session => { const courseName = session.parent_id ? byId(session.parent_id)?.title : dget(session, 'importedCourse'); return `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(session.id)}"><b>${esc(session.title || 'Estudo livre')}</b></button><small>${esc(fmtLong(session.day))}${courseName ? ` · ${esc(courseName)}${session.parent_id ? '' : ' (sem vínculo)'}` : ''}</small></span><b class="num">${esc(studyTimeText(session.num))}</b></li>`; }).join('')}</ul>` : emptyNote('Inicie um cronômetro para registrar seu primeiro estudo.'), { cls: 'lined' })}`;
}
function viewLearn(r) {
  const tab = pickTab(LTABS, r.tab);
  return `${hubHead(5, 'Sempre Aprendendo', 'Aprendizado <em>Acadêmico</em>', 'Cursos com grade curricular para acompanhar, flashcards que voltam antes de você esquecer, notas Cornell, tempo de estudo e certificados conquistados.')}${folderTabs('learn', LTABS, tab)}<div class="tab-body">${{ courses: tabCourses, cards: tabCards, notes: tabNotes, certs: tabCerts, study: tabStudy }[tab]()}</div>`;
}

// =====================================================================
// 6 · Health & Fitness
// =====================================================================
const HTABS = [['train', 'Treinos'], ['food', 'Macronutrientes'], ['body', 'Corpo e passos'], ['gallery', 'Galeria de progresso']];
ACTIONS['lift-pick'] = (b) => { S.ui.lift = b.dataset.v; rerender(); };
FORMS['lift-log'] = async (f) => { const v = (n) => Number(f.elements[n].value) || 0; const name = f.elements.ex.value.trim(); if (!name) { toast('Qual exercício?', { error: true }); return; } const prev = C.lifts(name)[0];
  try { await save({ kind: 'lift', title: name, day: today(), data: { weight: v('w'), reps: v('r'), sets: v('s') || 3, target: Number(dget(prev, 'target')) || 10, step: Number(dget(prev, 'step')) || 2.5 } }); S.ui.lift = name; const best = Math.max(0, ...C.lifts(name).slice(1).map(l => Number(dget(l, 'weight')) || 0)); if (prev && v('w') > best) bigWin(`Novo recorde em ${name}: ${v('w')} kg.`); else await sparkleWin('Registrado.'); rerender(); } catch (e) { fail(e); } };
function tabTrain() {
  const names = C.liftNames(); const cur = S.ui.lift && names.includes(S.ui.lift) ? S.ui.lift : names[0]; const hist = cur ? C.lifts(cur) : []; const sug = cur ? C.overload(cur) : null; const last = hist[0];
  const chron = [...hist].reverse().slice(-12); const r = C.rollup(); const cardio = sortBy(items('cardio'), c => c.day || '', -1);
  return `${twoCol(card(`Sobrecarga <em>progressiva</em>`, `${names.length ? `<div class="chips" role="group" aria-label="Exercício">${names.map(n => `<button class="chip" data-action="lift-pick" data-v="${esc(n)}" aria-pressed="${n === cur}">${esc(n)}</button>`).join('')}</div>` : ''}
    ${sug ? `<div class="next-set">${label('Próxima sessão', 'blue')}<b class="num">${sug.w} kg × ${sug.reps}</b><small class="muted">${esc(sug.why)}</small></div>` : ''}
    <form class="lift-form" data-form="lift-log" autocomplete="off"><label class="field"><span>Exercício</span><input class="input" name="ex" list="ex-list" value="${esc(cur || '')}" placeholder="Ex.: Agachamento"></label><datalist id="ex-list">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      <label class="field"><span>kg</span><input class="input num" name="w" inputmode="decimal" value="${sug ? sug.w : ''}"></label><label class="field"><span>Repetições</span><input class="input num" name="r" inputmode="numeric" value="${sug ? sug.reps : ''}"></label><label class="field"><span>Séries</span><input class="input num" name="s" inputmode="numeric" value="${dget(last, 'sets') || 3}"></label><button class="btn solid">Registrar</button></form>
    ${chron.length > 1 ? lineChart(chron.map(l => fmtShort(l.day)), [{ name: 'Weight', tone: 'c1', values: chron.map(l => Number(dget(l, 'weight')) || 0) }], { label: `${cur} over time`, h: 170, fmt: (x) => `${Math.round(x)}`, min: Math.max(0, Math.floor(Math.min(...chron.map(l => Number(dget(l, 'weight')) || 0)) * .85)), max: Math.ceil(Math.max(...chron.map(l => Number(dget(l, 'weight')) || 0)) * 1.08) }) : ''}
    ${hist.length ? `<ul class="rows lift-hist">${hist.slice(0, 6).map(l => `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(l.id)}">${esc(fmtShort(l.day))}</button></span><span class="num">${esc(String(dget(l, 'weight') || 0))} kg × ${esc(String(dget(l, 'reps') || 0))} × ${esc(String(dget(l, 'sets') || 0))}</span><small class="muted">${Math.round(C.liftVolume(l))} kg volume</small></li>`).join('')}</ul>` : ''}`, { cls: 'lined', pin: true }),
    card(`Cardio`, `<div class="tickets small-t"><div class="ticket c1"><span class="kick">Este ano</span><b class="num">${r.km} km</b><small>${r.miles} milhas</small></div><div class="ticket c4"><span class="kick">Dias de treino</span><b class="num">${r.workouts}</b></div></div>
    <ul class="rows">${cardio.slice(0, 8).map(c => `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(c.id)}"><b>${esc(c.title || CARDIO_KINDS[c.cat] || 'Sessão')}</b></button><small>${esc(fmtShort(c.day))} · ${esc(CARDIO_KINDS[c.cat] || '')}</small></span><span class="num">${esc(String(dget(c, 'km') || 0))} km${c.num ? ` · ${c.num} min` : ''}</span></li>`).join('') || '<li class="small muted">Nenhuma corrida ou caminhada ainda.</li>'}</ul>`, { link: addBtn('cardio', 'Cardio', { cls: 'sm ghost', preset: { day: today(), cat: 'run' } }) }))}`;
}
FORMS['macros-set'] = async (f) => { const v = (n) => Math.max(0, Number(f.elements[n].value) || 0); await saveData({ macros: { cal: v('cal'), protein: v('protein'), carbs: v('carbs'), fat: v('fat') } }); toast('Metas salvas.'); rerender(); };
ACTIONS['food-day'] = (b) => { S.ui.foodDay = b.dataset.v === '0' ? null : addDays(S.ui.foodDay || today(), Number(b.dataset.v)); rerender(); };
function tabFood() {
  const d = S.ui.foodDay || today(); const m = C.macrosOn(d); const tg = C.macroTargets(); const days = C.lastDays(7, d);
  return `<div class="wk-bar"><button class="icon-btn" data-action="food-day" data-v="-1" aria-label="Dia anterior">${icon('back')}</button><b>${esc(d === today() ? 'Hoje' : fmtLong(d))}</b><button class="icon-btn" data-action="food-day" data-v="1" aria-label="Próximo dia">${icon('fwd')}</button>${d !== today() ? `<button class="btn sm ghost" data-action="food-day" data-v="0">Hoje</button>` : ''}${addBtn('meal', 'Registrar alimentação', { cls: 'sm right', preset: { day: d, cat: 'l' } })}</div>
  <div class="macro-rings">${[['cal', 'Calorias', 'kcal'], ['protein', 'Proteína', 'g'], ['carbs', 'Carboidratos', 'g'], ['fat', 'Gorduras', 'g']].map(([k, l, u]) => `<div class="mring">${ring(C.pctOf(m[k], tg[k]), { tone: k === 'cal' ? 'c1' : k === 'protein' ? 'c2' : k === 'carbs' ? 'c3' : 'c4', text: `${Math.round(m[k])}`, label: `${l}: ${Math.round(m[k])} de ${tg[k]} ${u}` })}<b>${l}</b><small>de ${tg[k]} ${u} · faltam ${Math.max(0, Math.round(tg[k] - m[k]))}</small></div>`).join('')}</div>
  ${twoCol(card(`O que eu <em>comi</em>`, `<ul class="rows">${Object.keys(MEAL_SLOTS).flatMap(s => m.list.filter(x => (x.cat || 'l') === s)).map(x => `<li><span class="r-t"><button class="link-plain" data-action="edit" data-id="${esc(x.id)}"><b>${esc(x.title)}</b></button><small>${esc(MEAL_SLOTS[x.cat] || '')}</small></span><span class="num small">${Math.round(dget(x, 'cal') || 0)} kcal · P${Math.round(dget(x, 'protein') || 0)} C${Math.round(dget(x, 'carbs') || 0)} G${Math.round(dget(x, 'fat') || 0)}</span></li>`).join('') || '<li class="small muted">Nada registrado.</li>'}</ul>`, { cls: 'lined' }),
    card(`Sete <em>dias</em>`, `${barChart(days.map(x => ({ label: DAYS[parseDay(x).getDay()], value: C.macrosOn(x).cal, tone: C.macrosOn(x).cal > tg.cal * 1.1 ? 'c2' : 'c1', tip: `${fmtShort(x)}: ${Math.round(C.macrosOn(x).cal)} kcal` })), { label: 'Calorias, últimos 7 dias', h: 170 })}
    <details><summary class="small">Metas diárias</summary><form class="form-grid four" data-form="macros-set">${[['cal', 'Calorias'], ['protein', 'Proteína g'], ['carbs', 'Carboidratos g'], ['fat', 'Gorduras g']].map(([k, l]) => `<label class="field"><span>${l}</span><input class="input num" name="${k}" value="${tg[k]}" inputmode="numeric"></label>`).join('')}<button class="btn sm solid">Salvar</button></form></details>`))}`;
}
BINDS['steps-in'] = async (t, type) => { if (type !== 'change') return; const n = Math.max(0, Math.round(Number(t.value) || 0)); await saveData({ steps: { ...(D().steps || {}), [today()]: n } }); if (n >= C.stepGoal()) await sparkleWin('Meta de passos alcançada.'); rerender(); };
function tabBody() {
  const ms = C.measures(); const last = ms[ms.length - 1]; const first = ms[0]; const days = C.lastDays(14); const goal = C.stepGoal();
  const diff = (k) => (last && first && dget(last, k) != null && dget(first, k) != null ? round2(dget(last, k) - dget(first, k)) : null);
  return `${twoCol(card(`Passos`, `<div class="steps-today"><label class="field"><span>Hoje</span><input class="input big-in num" type="number" min="0" value="${C.stepsOn() || ''}" placeholder="0" data-bind="steps-in"></label>${ring(C.pctOf(C.stepsOn(), goal), { tone: 'c4', text: `${Math.round(C.pctOf(C.stepsOn(), goal) * 100)}%`, label: 'Da meta de passos' })}<small class="muted">Meta ${goal.toLocaleString()}</small></div>
    ${barChart(days.map(d => ({ label: String(parseDay(d).getDate()), value: C.stepsOn(d), tone: C.stepsOn(d) >= goal ? 'c4' : 'c5', tip: `${fmtShort(d)}: ${C.stepsOn(d).toLocaleString()} passos` })), { label: 'Passos, últimos 14 dias', h: 160, fmt: (x) => (x >= 1000 ? `${Math.round(x / 1000)}k` : Math.round(x)) })}`, { pin: true }),
    card(`Medidas corporais`, `${ms.length > 1 ? lineChart(ms.slice(-10).map(m => fmtShort(m.day)), [{ name: 'Peso (kg)', tone: 'c1', values: ms.slice(-10).map(m => dget(m, 'weight')) }], { min: Math.floor(Math.min(...ms.map(m => Number(dget(m, 'weight')) || 999)) - 2), max: Math.ceil(Math.max(...ms.map(m => Number(dget(m, 'weight')) || 0)) + 2), label: 'Peso ao longo do tempo', h: 170 }) : ''}
    ${last ? `<dl class="measure-dl">${[['weight','Peso'],['waist','Cintura'],['hips','Quadril'],['chest','Peito'],['arm','Braço']].map(([k,label]) => `<div><dt>${label}</dt><dd>${dget(last, k) ?? '—'}<small>${k === 'weight' ? 'kg' : 'cm'}</small>${diff(k) ? `<em class="${diff(k) < 0 ? 'good' : ''}">${diff(k) > 0 ? '+' : ''}${diff(k)}</em>` : ''}</dd></div>`).join('')}</dl><p class="small muted">Alteração desde ${esc(fmtShort(first.day))}.</p>` : emptyNote('Meça uma vez por mês, no mesmo dia e horário.')}`, { link: addBtn('measure', 'Medir', { cls: 'sm ghost', preset: { day: today() } }) }))}`;
}
GROUPS.physique = () => sortBy(items('physique'), x => x.day || '').flatMap(x => photosOf(x.id));
function tabGallery() {
  const l = sortBy(items('physique'), x => x.day || '', -1); const dates = [...new Set(l.map(x => x.day))];
  return `<p class="small muted evergreen">${icon('lock')} Privado: estas fotos ficam em uma pasta protegida e nunca aparecem em outro lugar do HUB.</p>
  <div class="okr-bar">${Object.entries(ANGLES).map(([k, a]) => addBtn('physique', a, { cls: 'sm ghost', preset: { cat: k, day: today() }, icon: 'camera' })).join('')}</div>
  ${dates.length > 1 ? `<section class="compare card">${pin()}<h2>Antes <em>e agora</em></h2><div class="cmp">${['front', 'side', 'back'].map(a => { const xs = l.filter(x => x.cat === a); if (xs.length < 2) return ''; const n = xs[0], o = xs[xs.length - 1]; return `<div class="cmp-pair"><span class="kick">${ANGLES[a]}</span><div>${polaroid(photosOf(o.id)[0], fmtShort(o.day), { group: 'physique', tilt: -2 })}${polaroid(photosOf(n.id)[0], fmtShort(n.day), { group: 'physique', tilt: 2 })}</div></div>`; }).join('')}</div></section>` : ''}
  ${dates.map(d => `<section class="ph-date"><h3>${label(fmtLong(d), 'blue')}</h3><div class="ph-row">${['front', 'side', 'back'].map(a => { const x = l.find(y => y.day === d && y.cat === a); return x ? polaroid(photosOf(x.id)[0], ANGLES[a], { group: 'physique', tilt: a === 'side' ? 1 : -1.5, tools: `<button class="icon-btn sm pol-edit" data-action="edit" data-id="${esc(x.id)}" aria-label="Editar">${icon('edit')}</button>` }) : `<button class="ph-empty" data-action="add" data-kind="physique" data-preset="${esc(JSON.stringify({ day: d, cat: a }))}">${icon('plus')}<span>${ANGLES[a]}</span></button>`; }).join('')}</div></section>`).join('') || emptyNote('Frontal, lateral e costas, uma vez por mês. Você agradecerá depois.')}`;
}
function viewHealth(r) {
  const tab = pickTab(HTABS, r.tab);
  return `${hubHead(6, 'Forte e Constante', 'Saúde e <em>Fitness</em>', 'Treinos que mostram o próximo desafio, alimentação calculada automaticamente, medidas corporais, passos e uma galeria privada de progresso.', addBtn('lift', 'Registrar treino', { cls: 'sm', preset: { day: today() } }))}${folderTabs('health', HTABS, tab)}<div class="tab-body">${{ train: tabTrain, food: tabFood, body: tabBody, gallery: tabGallery }[tab]()}</div>`;
}
export const VIEWS_GROWTH = { learn: viewLearn };
