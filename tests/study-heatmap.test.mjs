import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.location = { search: '', pathname: '/' };
const { S, ACTIONS, BINDS, hooks } = await import('../js/core.js');
const { db } = await import('../js/data.js');
const { studyMinutesByDay } = await import('../js/hub.js');
const { DEFS, normalizeHexColor } = await import('../js/kinds.js');
const importDocument = globalThis.document;
globalThis.document = { addEventListener() {} };
const { VIEWS_GROWTH } = await import('../js/views/growth.js');
if (importDocument === undefined) delete globalThis.document;
else globalThis.document = importDocument;

test('study minutes aggregate by date and exclude other years and kinds', () => {
  const originalItems = S.items;
  S.items = [
    { kind: 'study', day: '2026-03-10', num: 25 },
    { kind: 'study', day: '2026-03-10', num: 35 },
    { kind: 'study', day: '2025-03-10', num: 50 },
    { kind: 'session', day: '2026-03-10', num: 90 },
    { kind: 'study', day: '2026-03-11', num: -10 },
  ];

  try {
    assert.deepEqual(studyMinutesByDay(2026), {
      '2026-03-10': 60,
      '2026-03-11': 0,
    });
  } finally {
    S.items = originalItems;
  }
});

test('study sessions can be edited with a date, minutes, and optional course', () => {
  const fields = DEFS.study.fields;
  assert.ok(fields.some(field => field.k === 'day' && field.req));
  assert.ok(fields.some(field => field.k === 'num' && field.req));
  assert.ok(fields.some(field => field.k === 'parent_id' && field.type === 'ref' && field.of === 'course'));
});

test('syllabus JSON import appends undone steps to the selected course', async () => {
  const originalItems = S.items;
  const originalSave = db.save;
  const originalDocument = globalThis.document;
  const originalRerender = hooks.rerender;
  const toasts = [];
  let pickerOpened = false;
  const course = {
    id: 'course-syllabus',
    kind: 'course',
    title: 'Cirurgia Geral',
    data: { steps: [{ t: 'Etapa concluída', done: true }] },
  };
  S.items = [course];
  db.save = async (_kind, row) => row;
  hooks.rerender = () => {};
  const input = {
    value: 'syllabus.json',
    dataset: {},
    click() { pickerOpened = true; },
    files: [{
      size: 100,
      text: async () => JSON.stringify({
        format: 'hub-course-syllabus-v1',
        steps: ['Novo módulo', 'Nova aula'],
      }),
    }],
  };
  globalThis.document = {
    getElementById: () => input,
    createElement: () => ({ className: '', innerHTML: '', remove() {} }),
    querySelector: () => ({ appendChild: element => toasts.push(element.innerHTML) }),
  };

  try {
    ACTIONS['syllabus-import-open']({ dataset: { id: course.id } });
    assert.equal(pickerOpened, true);
    assert.equal(input.dataset.courseId, course.id);
    await BINDS['syllabus-import-file'](input, 'change');
    assert.equal(input.value, '');
    assert.equal(input.dataset.courseId, undefined);
    assert.deepEqual(S.items[0].data.steps, [
      { t: 'Etapa concluída', done: true },
      { t: 'Novo módulo', done: false },
      { t: 'Nova aula', done: false },
    ]);
    assert.match(toasts[0], /2 etapas adicionadas/);
    assert.match(toasts[0], /progresso existente foi preservado/);
  } finally {
    S.items = originalItems;
    db.save = originalSave;
    hooks.rerender = originalRerender;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('invalid syllabus JSON does not change the selected course', async () => {
  const originalItems = S.items;
  const originalSave = db.save;
  const originalDocument = globalThis.document;
  const originalRerender = hooks.rerender;
  const originalConsoleError = console.error;
  const toasts = [];
  let saveCalled = false;
  const course = {
    id: 'course-syllabus-invalid',
    kind: 'course',
    title: 'Anatomia',
    data: { steps: [{ t: 'Etapa existente', done: false }] },
  };
  S.items = [course];
  db.save = async (_kind, row) => { saveCalled = true; return row; };
  hooks.rerender = () => {};
  console.error = () => {};
  globalThis.document = {
    createElement: () => ({ className: '', innerHTML: '', remove() {} }),
    querySelector: () => ({ appendChild: element => toasts.push({ className: element.className, innerHTML: element.innerHTML }) }),
  };
  const input = {
    value: 'invalid-syllabus.json',
    dataset: { courseId: course.id },
    files: [{
      size: 100,
      text: async () => JSON.stringify({
        format: 'hub-course-syllabus-v1',
        steps: ['Etapa válida', ''],
      }),
    }],
  };

  try {
    await BINDS['syllabus-import-file'](input, 'change');
    assert.equal(saveCalled, false);
    assert.deepEqual(S.items[0].data.steps, [{ t: 'Etapa existente', done: false }]);
    assert.match(toasts[0].innerHTML, /Etapa 2/);
    assert.match(toasts[0].className, /toast err/);
  } finally {
    S.items = originalItems;
    db.save = originalSave;
    hooks.rerender = originalRerender;
    console.error = originalConsoleError;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('syllabus lesson opens a prefilled time block in the agenda', () => {
  const originalItems = S.items;
  const originalHash = globalThis.location.hash;
  globalThis.location.hash = '#/learn?tab=courses';
  S.items = [{
    id: 'course-1',
    kind: 'course',
    title: 'Cirurgia Geral',
    data: { steps: [{ t: 'Trauma Abdominal', done: false }] },
  }];

  try {
    const html = VIEWS_GROWTH.learn({ tab: 'courses' });
    assert.match(html, /data-action="add" data-kind="block"/);
    assert.match(html, /&quot;title&quot;:&quot;Trauma Abdominal&quot;/);
    assert.match(html, /&quot;start&quot;:&quot;09:00&quot;,&quot;end&quot;:&quot;10:00&quot;/);
    assert.match(html, /Adicionar Trauma Abdominal como bloco de tempo à agenda/);
  } finally {
    S.items = originalItems;
    globalThis.location.hash = originalHash;
  }
});

test('heatmap legend color changes persist for the selected intensity', async () => {
  const originalSettings = S.settings;
  const originalSaveSettings = db.saveSettings;
  const originalRerender = hooks.rerender;
  S.settings = { ...S.settings, data: { ...(S.settings.data || {}) } };
  db.saveSettings = async patch => patch;
  hooks.rerender = () => {};

  try {
    await BINDS['study-heat-color']({ value: '#123ABC', dataset: { level: '5' } }, 'change');
    assert.equal(S.settings.data.studyHeatColors[5], normalizeHexColor('#123ABC'));
  } finally {
    S.settings = originalSettings;
    db.saveSettings = originalSaveSettings;
    hooks.rerender = originalRerender;
  }
});

test('study JSON import adds validated sessions and links matching courses', async () => {
  const originalItems = S.items;
  const originalInsertMany = db.insertMany;
  const originalDocument = globalThis.document;
  const originalRerender = hooks.rerender;
  const toasts = [];
  S.items = [{ id: 'course-1', kind: 'course', title: 'Cirurgia Geral', data: {} }];
  db.insertMany = async (_kind, rows) => rows.map((row, index) => ({ ...row, id: `study-${index}` }));
  hooks.rerender = () => {};
  globalThis.document = {
    createElement: () => ({ className: '', innerHTML: '', remove() {} }),
    querySelector: () => ({ appendChild: element => toasts.push({ className: element.className, innerHTML: element.innerHTML }) }),
  };
  const input = {
    value: 'study.json',
    files: [{
      size: 100,
      text: async () => JSON.stringify({
        format: 'hub-study-sessions-v1',
        sessions: [
          { date: '2026-11-26', lesson: 'Trauma Abdominal', minutes: 60, course: 'Cirurgia Geral' },
          { date: '2026-11-27', lesson: 'Revisão', minutes: 30, course: 'Curso externo' },
        ],
      }),
    }],
  };

  try {
    await BINDS['study-import-file'](input, 'change');
    assert.equal(input.value, '');
    assert.deepEqual(S.items.filter(item => item.kind === 'study').map(({ title, day, num, parent_id, data }) => ({ title, day, num, parent_id, data })), [
      { title: 'Trauma Abdominal', day: '2026-11-26', num: 60, parent_id: 'course-1', data: undefined },
      { title: 'Revisão', day: '2026-11-27', num: 30, parent_id: null, data: { importedCourse: 'Curso externo' } },
    ]);
    assert.match(toasts[0].innerHTML, /2 sessões importadas/);
    assert.match(toasts[0].innerHTML, /Curso não vinculado/);
  } finally {
    S.items = originalItems;
    db.insertMany = originalInsertMany;
    hooks.rerender = originalRerender;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('invalid study JSON is rejected before any session is saved', async () => {
  const originalItems = S.items;
  const originalInsertMany = db.insertMany;
  const originalDocument = globalThis.document;
  const originalRerender = hooks.rerender;
  const originalConsoleError = console.error;
  const toasts = [];
  let saveCalled = false;
  S.items = [];
  db.insertMany = async () => { saveCalled = true; return []; };
  hooks.rerender = () => {};
  console.error = () => {};
  globalThis.document = {
    createElement: () => ({ className: '', innerHTML: '', remove() {} }),
    querySelector: () => ({ appendChild: element => toasts.push({ className: element.className, innerHTML: element.innerHTML }) }),
  };
  const input = {
    value: 'invalid.json',
    files: [{
      size: 100,
      text: async () => JSON.stringify({
        format: 'hub-study-sessions-v1',
        sessions: [{ date: '2026-02-31', lesson: 'Aula', minutes: 30 }],
      }),
    }],
  };

  try {
    await BINDS['study-import-file'](input, 'change');
    assert.equal(saveCalled, false);
    assert.equal(S.items.length, 0);
    assert.match(toasts[0].innerHTML, /data não existe no calendário/);
    assert.match(toasts[0].className, /toast err/);
  } finally {
    S.items = originalItems;
    db.insertMany = originalInsertMany;
    hooks.rerender = originalRerender;
    console.error = originalConsoleError;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('stopping a lesson timer completes its syllabus step and saves study time', async () => {
  const originalItems = S.items;
  const originalTimer = S.ui.studyTimer;
  const originalSave = db.save;
  const originalRerender = hooks.rerender;
  const originalDocument = globalThis.document;
  const originalSetTimeout = globalThis.setTimeout;
  let nextId = 0;
  S.items = [{
    id: 'course-1',
    kind: 'course',
    title: 'Cirurgia Geral',
    data: { steps: [{ t: 'Trauma Abdominal', done: false }, { t: 'Aula seguinte', done: false }] },
  }];
  S.ui.studyTimer = {
    startedAt: null, elapsedMs: 60_000, day: '2026-11-26',
    courseId: 'course-1', stepIndex: 0, lessonTitle: 'Trauma Abdominal',
  };
  db.save = async (_kind, row) => ({ ...row, id: row.id || `saved-${++nextId}` });
  hooks.rerender = () => {};
  globalThis.document = {
    createElement: () => ({ remove() {} }),
    querySelector: () => ({ appendChild() {} }),
  };
  globalThis.setTimeout = (callback) => { callback(); return 0; };

  try {
    await ACTIONS['study-timer']({ dataset: { v: 'stop' } });

    const course = S.items.find(item => item.id === 'course-1');
    assert.equal(course.data.steps[0].done, true);
    assert.equal(course.data.steps[1].done, false);
    assert.ok(S.items.some(item => item.kind === 'study' && item.title === 'Trauma Abdominal' && item.parent_id === 'course-1'));
    assert.equal(S.ui.studyTimer, null);
  } finally {
    S.items = originalItems;
    S.ui.studyTimer = originalTimer;
    db.save = originalSave;
    hooks.rerender = originalRerender;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    globalThis.setTimeout = originalSetTimeout;
  }
});
