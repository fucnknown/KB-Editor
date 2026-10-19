import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHtmlContent,
  stripHtml,
  truncateWords,
  findEditableCollection,
  detectTitleField,
  analyzeSchema,
  parseAndValidateJson,
  matchesQuery,
  reconstructJson,
  unifyParagraphsFromVariations,
  syncUnifiedTextToVariations,
  getItemFieldValue,
  setItemFieldValue,
  normalizeLabelValue,
  normalizeCategoryValue,
} from './jsonEngine.ts';

test('isHtmlContent detects valid HTML tags and ignores plain text', () => {
  assert.equal(isHtmlContent('<p>Hola mundo</p>'), true);
  assert.equal(isHtmlContent('<div><strong>Importante:</strong> texto</div>'), true);
  assert.equal(isHtmlContent('3 < 5 y 10 > 2'), false);
  assert.equal(isHtmlContent('Simplemente texto plano'), false);
  assert.equal(isHtmlContent(123), false);
  assert.equal(isHtmlContent(null), false);
});

test('stripHtml cleans HTML tags and entities', () => {
  assert.equal(stripHtml('<p>Texto con <b>negrita</b> &amp; enlace</p>'), 'Texto con negrita & enlace');
  assert.equal(stripHtml('Texto simple'), 'Texto simple');
});

test('truncateWords truncates strings with more than 20 words and appends ...', () => {
  const shortText = 'Una dos tres cuatro cinco palabras.';
  const resShort = truncateWords(shortText, 20);
  assert.equal(resShort.isTruncated, false);
  assert.equal(resShort.text, shortText);

  const longText = 'Palabra1 Palabra2 Palabra3 Palabra4 Palabra5 Palabra6 Palabra7 Palabra8 Palabra9 Palabra10 Palabra11 Palabra12 Palabra13 Palabra14 Palabra15 Palabra16 Palabra17 Palabra18 Palabra19 Palabra20 Palabra21 Palabra22 extra';
  const resLong = truncateWords(longText, 20);
  assert.equal(resLong.isTruncated, true);
  const words = resLong.text.replace('...', '').trim().split(/\s+/);
  assert.equal(words.length, 20);
  assert.ok(resLong.text.endsWith('...'));
});

test('normalizeLabelValue and normalizeCategoryValue safely extract name attribute', () => {
  assert.equal(normalizeLabelValue({ name: 'Interno' }), 'Interno');
  assert.equal(normalizeLabelValue('Convenio'), 'Convenio');
  assert.equal(normalizeCategoryValue({ name: 'SECTOR' }), 'SECTOR');
  assert.equal(normalizeCategoryValue('SERVICIO'), 'SERVICIO');
});

test('unifyParagraphsFromVariations supports CMS block.paragraph.blocks structure', () => {
  const variations = [
    {
      body: {
        blocks: [
          {
            type: 'Paragraph',
            paragraph: {
              blocks: [
                { type: 'Text', text: { text: 'MAIL: ', marks: ['Bold'] } },
                { type: 'Text', text: { text: 'consulta@hospital.org' } }
              ],
              properties: { fontType: 'Paragraph' }
            }
          },
          {
            type: 'Paragraph',
            paragraph: {
              blocks: [
                { type: 'Text', text: { text: 'Segundo párrafo informativo.' } }
              ],
              properties: { fontType: 'Paragraph' }
            }
          }
        ]
      }
    }
  ];

  const unified = unifyParagraphsFromVariations(variations);
  assert.ok(unified.includes('MAIL: consulta@hospital.org'));
  assert.ok(unified.includes('Segundo párrafo informativo.'));
  assert.ok(unified.includes('\n\n'));
});

test('findEditableCollection identifies documents collection in KnowledgeBase format', () => {
  const kbJson = {
    version: 2,
    knowledgeBase: { id: 'kb-123' },
    documents: [
      { id: 'doc-1', published: { title: 'Doc 1' } },
      { id: 'doc-2', published: { title: 'Doc 2' } }
    ],
    categories: [],
    labels: []
  };

  const found = findEditableCollection(kbJson);
  assert.notEqual(found, null);
  assert.equal(found?.rootType, 'object');
  assert.deepEqual(found?.path, ['documents']);
  assert.equal(found?.collection.length, 2);
});

test('getItemFieldValue extracts name from category object and label objects', () => {
  const item = {
    id: 'abc-123',
    published: {
      title: 'Título Hospital',
      category: { name: 'SECTOR' },
      labels: [{ name: 'Interno' }, { name: 'Guardia' }],
      visible: true
    }
  };

  assert.equal(getItemFieldValue(item, 'title'), 'Título Hospital');
  assert.equal(getItemFieldValue(item, 'category'), 'SECTOR');
  assert.deepEqual(getItemFieldValue(item, 'labels'), ['Interno', 'Guardia']);
});

test('parseAndValidateJson parses Hospital Britanico dataset without error', () => {
  const raw = JSON.stringify({
    version: 2,
    knowledgeBase: { id: '67aa8661-ea9a-46c4-a86b-6571885e1f42' },
    documents: [
      {
        id: 'doc-1',
        published: {
          title: 'DEPARTAMENTO DE EXCELENCIA MÉDICA',
          category: { name: 'SECTOR' },
          labels: [{ name: 'Interno' }],
          visible: true,
          variations: [
            {
              body: {
                blocks: [
                  {
                    type: 'Paragraph',
                    paragraph: {
                      blocks: [
                        { type: 'Text', text: { text: 'MAIL: ' } },
                        { type: 'Text', text: { text: 'info@hospital.org' } }
                      ]
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  });

  const parsed = parseAndValidateJson(raw);
  assert.equal(parsed.success, true);
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.titleField, 'title');
  assert.equal(getItemFieldValue(parsed.items[0].data, 'category'), 'SECTOR');
  assert.deepEqual(getItemFieldValue(parsed.items[0].data, 'labels'), ['Interno']);
});
