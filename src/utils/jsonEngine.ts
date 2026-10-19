/**
 * Core JSON processing engine: structure detection, schema extraction,
 * HTML detection/sanitization helpers, truncation, search, reconstruction,
 * CMS 'published' nested object, category/labels extraction, and variation paragraph unification.
 */

export interface ColumnDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'null' | 'array' | 'object' | 'html';
  isTitle: boolean;
  visible: boolean;
}

export interface EditableItem {
  _internalId: string;
  data: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  error?: string;
  rootStructure: 'array' | 'object';
  collectionPath: string[];
  originalRoot: any;
  items: EditableItem[];
  columns: ColumnDefinition[];
  titleField: string;
  indentation: number;
}

/**
 * Detects if a string contains HTML tags
 */
export function isHtmlContent(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length < 3) return false;
  const htmlTagPattern = /<\/?(?:p|div|span|h[1-6]|b|strong|i|em|u|ul|ol|li|a|br|hr|table|tr|td|th|tbody|thead|code|pre|blockquote|em)[^>]*>/i;
  return htmlTagPattern.test(trimmed);
}

/**
 * Strips HTML tags from a string to extract plain readable text
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Word truncation: truncates to maxWords without mutating underlying data.
 * Counts words based on whitespace separation.
 */
export function truncateWords(content: string, maxWords: number = 20): { text: string; isTruncated: boolean } {
  if (!content || typeof content !== 'string') {
    return { text: String(content ?? ''), isTruncated: false };
  }

  const plainText = isHtmlContent(content) ? stripHtml(content) : content;
  const words = plainText.trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return { text: plainText, isTruncated: false };
  }

  const truncated = words.slice(0, maxWords).join(' ') + '...';
  return { text: truncated, isTruncated: true };
}

/**
 * Detects indentation of a JSON string (default 2 spaces)
 */
export function detectIndentation(jsonString: string): number {
  const match = jsonString.match(/^[ \t]+(?=["{\[])/m);
  if (!match) return 2;
  const leading = match[0];
  if (leading.includes('\t')) return 2;
  return leading.length > 0 ? leading.length : 2;
}

/**
 * Helper to safely extract text from a block or nested text item
 */
function extractTextFromItem(item: any): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);

  // If item.text is an object: { text: "..." }
  if (item.text && typeof item.text === 'object') {
    return extractTextFromItem(item.text.text ?? item.text.value);
  }
  if (typeof item.text === 'string') {
    return item.text;
  }
  if (typeof item.value === 'string') {
    return item.value;
  }
  if (typeof item.content === 'string') {
    return item.content;
  }
  if (typeof item.phrase === 'string') {
    return item.phrase;
  }
  return '';
}

/**
 * Unifies paragraph and block texts from variations:
 * Supports standard paragraph structures as well as CMS nested structures like:
 * - blocks: [ { type: "Paragraph", paragraph: { blocks: [ { text: { text: "..." } } ] } } ]
 * - blocks: [ { type: "paragraph", text: "..." } ]
 * - paragraphs: [ { text: "..." } ]
 * Joins paragraphs with \n\n (double newline) to represent paragraph breaks.
 */
export function unifyParagraphsFromVariations(variations: any): string {
  if (!variations) return '';

  const extractedParagraphs: string[] = [];

  const extractFromBlock = (block: any) => {
    if (!block || typeof block !== 'object') return;

    // Case 1: CMS Structure with block.paragraph.blocks
    // e.g. { type: "Paragraph", paragraph: { blocks: [ { type: "Text", text: { text: "..." } } ] } }
    if (block.paragraph && typeof block.paragraph === 'object' && Array.isArray(block.paragraph.blocks)) {
      const parts = block.paragraph.blocks.map(extractTextFromItem).filter(s => s !== '');
      if (parts.length > 0) {
        extractedParagraphs.push(parts.join(''));
        return;
      }
    }

    // Case 2: block has nested blocks array: e.g. { type: "paragraph", blocks: [...] }
    if (Array.isArray(block.blocks) && block.blocks.length > 0) {
      const parts = block.blocks.map(extractTextFromItem).filter(s => s !== '');
      if (parts.length > 0) {
        extractedParagraphs.push(parts.join(''));
        return;
      }
    }

    // Case 3: Direct text on block: { type: "paragraph", text: "..." }
    const directText = extractTextFromItem(block);
    if (directText.trim().length > 0) {
      extractedParagraphs.push(directText.trim());
    }
  };

  const processContainer = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(processContainer);
      return;
    }

    // Check variation body or blocks
    const blocks = obj.body?.blocks || obj.blocks || obj.paragraphs || obj.body?.paragraphs;
    if (Array.isArray(blocks) && blocks.length > 0) {
      blocks.forEach(extractFromBlock);
      return;
    }

    if (obj.body && typeof obj.body === 'object') {
      processContainer(obj.body);
      return;
    }

    const text = extractTextFromItem(obj);
    if (text.trim().length > 0) {
      extractedParagraphs.push(text.trim());
    }
  };

  processContainer(variations);

  return extractedParagraphs.join('\n\n');
}

/**
 * Updates variations structure with new unified text while preserving original
 * block schema (e.g. block.paragraph.blocks with type "Paragraph").
 */
export function syncUnifiedTextToVariations(originalVariations: any, newUnifiedText: string): any {
  if (!originalVariations) {
    const lines = newUnifiedText.split(/\n\s*\n/).map(l => l.trim()).filter(Boolean);
    return [
      {
        body: {
          blocks: lines.map(line => ({
            type: 'paragraph',
            text: line,
          })),
        },
      },
    ];
  }

  const cloned = JSON.parse(JSON.stringify(originalVariations));
  const paragraphLines = newUnifiedText.includes('\n\n')
    ? newUnifiedText.split(/\n\s*\n/).map(l => l.trim()).filter(Boolean)
    : newUnifiedText.split('\n').map(l => l.trim()).filter(Boolean);

  const updateBlocksArray = (targetBlocks: any[], lines: string[]) => {
    const firstBlock = targetBlocks[0] || {};
    const hasCmsParagraph = Boolean(firstBlock.paragraph && Array.isArray(firstBlock.paragraph.blocks));
    const resultBlocks: any[] = [];

    lines.forEach((line, idx) => {
      if (idx < targetBlocks.length) {
        const existing = JSON.parse(JSON.stringify(targetBlocks[idx]));
        if (existing.paragraph && Array.isArray(existing.paragraph.blocks)) {
          // Update CMS paragraph structure
          existing.paragraph.blocks = [
            {
              type: 'Text',
              text: { text: line },
            },
          ];
        } else if (Array.isArray(existing.blocks)) {
          existing.blocks = [{ type: 'text', text: line }];
        } else {
          existing.text = line;
        }
        resultBlocks.push(existing);
      } else {
        // Create new block matching format
        if (hasCmsParagraph) {
          resultBlocks.push({
            type: 'Paragraph',
            paragraph: {
              blocks: [
                {
                  type: 'Text',
                  text: { text: line },
                },
              ],
              properties: { fontType: 'Paragraph' },
            },
          });
        } else {
          resultBlocks.push({
            type: firstBlock.type || 'paragraph',
            text: line,
          });
        }
      }
    });

    return resultBlocks;
  };

  if (Array.isArray(cloned) && cloned.length > 0) {
    const firstVar = cloned[0];
    if (firstVar.body?.blocks && Array.isArray(firstVar.body.blocks)) {
      firstVar.body.blocks = updateBlocksArray(firstVar.body.blocks, paragraphLines);
    } else if (firstVar.blocks && Array.isArray(firstVar.blocks)) {
      firstVar.blocks = updateBlocksArray(firstVar.blocks, paragraphLines);
    } else if (firstVar.paragraphs && Array.isArray(firstVar.paragraphs)) {
      firstVar.paragraphs = updateBlocksArray(firstVar.paragraphs, paragraphLines);
    } else {
      if (!firstVar.body) firstVar.body = {};
      firstVar.body.blocks = paragraphLines.map(line => ({ type: 'paragraph', text: line }));
    }
  }

  return cloned;
}

/**
 * Normalizes label items so that objects like { name: "Interno" } are cleanly converted
 * to their display string "Interno", preventing React child errors.
 */
export function normalizeLabelValue(lbl: any): string {
  if (lbl === null || lbl === undefined) return '';
  if (typeof lbl === 'string') return lbl;
  if (typeof lbl === 'object') {
    return lbl.name ?? lbl.label ?? lbl.title ?? lbl.value ?? JSON.stringify(lbl);
  }
  return String(lbl);
}

/**
 * Normalizes category value: if object { name: "SECTOR" }, extracts "SECTOR".
 */
export function normalizeCategoryValue(cat: any): string {
  if (cat === null || cat === undefined) return '';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object') {
    return cat.name ?? cat.label ?? cat.title ?? JSON.stringify(cat);
  }
  return String(cat);
}

/**
 * Gets value of a field from an item, looking into 'published' first if applicable,
 * and normalizing { name: ... } objects for category and labels!
 */
export function getItemFieldValue(itemData: Record<string, any>, key: string): any {
  if (!itemData) return undefined;

  // Direct dot notation support e.g. 'published.title'
  if (key.includes('.')) {
    const parts = key.split('.');
    let curr: any = itemData;
    for (const part of parts) {
      if (curr === null || curr === undefined) return undefined;
      curr = curr[part];
    }
    return curr;
  }

  // If item has a 'published' object, prioritize published properties
  if (itemData.published && typeof itemData.published === 'object') {
    if (key === 'title') {
      return itemData.published.title ?? itemData.title ?? itemData.name;
    }
    if (key === 'category' || key === 'categoria') {
      const catVal = itemData.published.category ?? itemData.published.categoria ?? itemData.category ?? itemData.categoria;
      return normalizeCategoryValue(catVal);
    }
    if (key === 'visible') {
      return itemData.published.visible ?? itemData.visible;
    }
    if (key === 'labels') {
      const rawLabels = itemData.published.labels ?? itemData.labels;
      if (Array.isArray(rawLabels)) {
        return rawLabels.map(normalizeLabelValue);
      }
      return rawLabels;
    }
    if (key === 'variations') {
      return itemData.published.variations ?? itemData.variations;
    }
    if (key === 'body' || key === 'text') {
      if (itemData.published.body !== undefined && typeof itemData.published.body === 'string') {
        return itemData.published.body;
      }
      if (itemData.published.text !== undefined && typeof itemData.published.text === 'string') {
        return itemData.published.text;
      }
      if (itemData.published.variations) {
        return unifyParagraphsFromVariations(itemData.published.variations);
      }
      return itemData[key];
    }
    if (itemData.published[key] !== undefined) {
      return itemData.published[key];
    }
  }

  // Root fallbacks
  if (key === 'category' || key === 'categoria') {
    return normalizeCategoryValue(itemData[key]);
  }
  if (key === 'labels' && Array.isArray(itemData.labels)) {
    return itemData.labels.map(normalizeLabelValue);
  }
  if (key === 'body' || key === 'text') {
    if (itemData.variations) {
      return unifyParagraphsFromVariations(itemData.variations);
    }
  }

  return itemData[key];
}

/**
 * Sets value of a field on an item, updating 'published' appropriately
 */
export function setItemFieldValue(
  itemData: Record<string, any>,
  key: string,
  value: any
): Record<string, any> {
  const result = JSON.parse(JSON.stringify(itemData));

  // If itemData has a 'published' object
  if (result.published && typeof result.published === 'object') {
    if (key === 'title') {
      result.published.title = value;
      return result;
    }
    if (key === 'visible') {
      result.published.visible = Boolean(value);
      return result;
    }
    if (key === 'category' || key === 'categoria') {
      if (result.published.category && typeof result.published.category === 'object') {
        result.published.category.name = value;
      } else {
        result.published.category = { name: value };
      }
      return result;
    }
    if (key === 'labels') {
      if (Array.isArray(value)) {
        // preserve object format if originally objects
        const originallyObjects = Array.isArray(result.published.labels) &&
          result.published.labels.some((l: any) => typeof l === 'object');
        if (originallyObjects) {
          result.published.labels = value.map(v => (typeof v === 'string' ? { name: v } : v));
        } else {
          result.published.labels = value.map(v => (typeof v === 'object' ? v.name ?? String(v) : v));
        }
      } else {
        result.published.labels = value;
      }
      return result;
    }
    if (key === 'variations') {
      result.published.variations = value;
      return result;
    }
    if (key === 'body' || key === 'text') {
      if (result.published.variations) {
        result.published.variations = syncUnifiedTextToVariations(result.published.variations, String(value));
      } else {
        result.published[key] = value;
      }
      return result;
    }

    if (result.published[key] !== undefined) {
      result.published[key] = value;
      return result;
    }
  }

  result[key] = value;
  return result;
}

/**
 * Heuristic to detect the title field:
 * CRITICAL: 'title' es el titulo del objeto a editar, NO el 'id'.
 */
export function detectTitleField(allKeys: string[], items: Record<string, any>[]): string {
  const hasPublishedTitle = items.some(it => it.published?.title && typeof it.published.title === 'string');
  if (hasPublishedTitle) {
    return 'title';
  }

  const priorityPatterns = [
    /^title$/i,
    /^titulo$/i,
    /^name$/i,
    /^nombre$/i,
    /^headline$/i,
    /^header$/i,
    /^subject$/i,
    /^label$/i,
  ];

  for (const pattern of priorityPatterns) {
    const found = allKeys.find(k => pattern.test(k));
    if (found) return found;
  }

  const secondary = allKeys.find(k => /(title|titulo|name|nombre|subject)/i.test(k));
  if (secondary) return secondary;

  for (const key of allKeys) {
    if (/^id$/i.test(key)) continue;
    const hasString = items.some(it => typeof it[key] === 'string' && it[key].trim().length > 0);
    if (hasString) return key;
  }

  return allKeys.find(k => !/^id$/i.test(k)) || allKeys[0] || 'title';
}

/**
 * Analyzes items and determines column definitions, expanding 'published' fields
 */
export function analyzeSchema(items: Record<string, any>[]): { columns: ColumnDefinition[]; titleField: string } {
  const keySet = new Set<string>();
  const hasPublished = items.some(it => it && it.published && typeof it.published === 'object');

  if (hasPublished) {
    keySet.add('title');
    keySet.add('category');
    keySet.add('visible');
    keySet.add('labels');
    keySet.add('body');
    keySet.add('variations');
  }

  for (const item of items) {
    if (item && typeof item === 'object') {
      Object.keys(item).forEach(k => {
        if (!k.startsWith('_internal') && k !== 'published') {
          keySet.add(k);
        }
      });
      if (item.published && typeof item.published === 'object') {
        Object.keys(item.published).forEach(pk => {
          keySet.add(pk);
        });
      }
    }
  }

  const allKeys = Array.from(keySet);
  const titleField = detectTitleField(allKeys, items);

  const columns: ColumnDefinition[] = allKeys.map(key => {
    let detectedType: ColumnDefinition['type'] = 'string';
    let hasHtml = false;
    let hasNumber = false;
    let hasBoolean = false;
    let hasArray = false;
    let hasObject = false;
    let hasNull = false;
    let hasString = false;

    for (const item of items) {
      const val = getItemFieldValue(item, key);
      if (val === null || val === undefined) {
        hasNull = true;
      } else if (Array.isArray(val)) {
        hasArray = true;
      } else if (typeof val === 'boolean') {
        hasBoolean = true;
      } else if (typeof val === 'number') {
        hasNumber = true;
      } else if (typeof val === 'object') {
        hasObject = true;
      } else if (typeof val === 'string') {
        hasString = true;
        if (isHtmlContent(val)) {
          hasHtml = true;
        }
      }
    }

    if (key === 'category' || key === 'categoria') {
      detectedType = 'string';
    } else if (key === 'labels') {
      detectedType = 'array';
    } else if (hasHtml) {
      detectedType = 'html';
    } else if (hasArray) {
      detectedType = 'array';
    } else if (hasObject) {
      detectedType = 'object';
    } else if (hasBoolean && !hasString && !hasNumber) {
      detectedType = 'boolean';
    } else if (hasNumber && !hasString) {
      detectedType = 'number';
    } else if (hasNull && !hasString && !hasNumber && !hasBoolean) {
      detectedType = 'null';
    } else {
      detectedType = 'string';
    }

    const isTitleCol = key === titleField || key === 'title';

    return {
      key,
      label: formatColumnLabel(key),
      type: detectedType,
      isTitle: isTitleCol,
      visible: true,
    };
  });

  // Reorder so that titleField is first, then id, then category, visible, labels, body, variations
  columns.sort((a, b) => {
    if (a.isTitle) return -1;
    if (b.isTitle) return 1;
    if (a.key === 'id') return -1;
    if (b.key === 'id') return 1;
    return 0;
  });

  return { columns, titleField: 'title' in keySet ? 'title' : titleField };
}

function formatColumnLabel(key: string): string {
  const dictionary: Record<string, string> = {
    title: 'Título',
    titulo: 'Título',
    category: 'Categoría',
    categoria: 'Categoría',
    visible: 'Visibilidad',
    labels: 'Etiquetas',
    variations: 'Variaciones',
    body: 'Cuerpo / Párrafos',
    text: 'Texto',
    id: 'ID',
    activo: 'Activo',
    active: 'Activo',
  };

  if (dictionary[key.toLowerCase()]) {
    return dictionary[key.toLowerCase()];
  }

  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Analyzes JSON root and locates primary array of objects.
 * Supports "documents", "items", "data", "records", etc.
 */
export function findEditableCollection(root: any): { collection: Record<string, any>[]; path: string[]; rootType: 'array' | 'object' } | null {
  if (Array.isArray(root)) {
    if (root.length === 0) return { collection: [], path: [], rootType: 'array' };
    const allObjects = root.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
    if (allObjects) {
      return { collection: root, path: [], rootType: 'array' };
    }
    return null;
  }

  if (root !== null && typeof root === 'object') {
    const preferredKeys = [
      'documents', 'articles', 'items', 'data', 'records', 'results',
      'courses', 'products', 'elements', 'posts', 'users', 'entries', 'rows', 'list'
    ];

    for (const key of preferredKeys) {
      const val = root[key];
      if (Array.isArray(val) && val.length > 0 && val.every(it => it !== null && typeof it === 'object' && !Array.isArray(it))) {
        return { collection: val, path: [key], rootType: 'object' };
      }
    }

    for (const key of Object.keys(root)) {
      const val = root[key];
      if (Array.isArray(val) && val.length > 0 && val.every(it => it !== null && typeof it === 'object' && !Array.isArray(it))) {
        return { collection: val, path: [key], rootType: 'object' };
      }
    }

    for (const topKey of Object.keys(root)) {
      const topVal = root[topKey];
      if (topVal !== null && typeof topVal === 'object' && !Array.isArray(topVal)) {
        for (const subKey of preferredKeys) {
          const subVal = topVal[subKey];
          if (Array.isArray(subVal) && subVal.length > 0 && subVal.every(it => it !== null && typeof it === 'object' && !Array.isArray(it))) {
            return { collection: subVal, path: [topKey, subKey], rootType: 'object' };
          }
        }
      }
    }

    for (const key of preferredKeys) {
      if (Array.isArray(root[key])) {
        return { collection: root[key], path: [key], rootType: 'object' };
      }
    }
    for (const key of Object.keys(root)) {
      if (Array.isArray(root[key])) {
        return { collection: root[key], path: [key], rootType: 'object' };
      }
    }
  }

  return null;
}

/**
 * Validates and parses raw JSON string
 */
export function parseAndValidateJson(rawJson: string): ParseResult {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: any) {
    return {
      success: false,
      error: `Error de sintaxis JSON: ${err.message || 'Formato JSON inválido.'}`,
      rootStructure: 'object',
      collectionPath: [],
      originalRoot: null,
      items: [],
      columns: [],
      titleField: 'title',
      indentation: 2,
    };
  }

  const found = findEditableCollection(parsed);
  if (!found) {
    return {
      success: false,
      error: 'El archivo JSON no contiene una colección editable compatible (se esperaba un array de objetos o una propiedad como "documents", "items", "data", etc.).',
      rootStructure: 'object',
      collectionPath: [],
      originalRoot: parsed,
      items: [],
      columns: [],
      titleField: 'title',
      indentation: 2,
    };
  }

  const { collection, path, rootType } = found;
  const items: EditableItem[] = collection.map((item, idx) => ({
    _internalId: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    data: { ...item },
  }));

  const { columns, titleField } = analyzeSchema(collection);
  const indentation = detectIndentation(rawJson);

  return {
    success: true,
    rootStructure: rootType,
    collectionPath: path,
    originalRoot: parsed,
    items,
    columns,
    titleField,
    indentation,
  };
}

/**
 * Searches an item for a given query case-insensitively, inspecting published & unified text
 */
export function matchesQuery(itemData: Record<string, any>, query: string, fieldFilter?: string): boolean {
  if (!query || query.trim() === '') return true;
  const q = query.trim().toLowerCase();

  const checkValue = (val: any): boolean => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') {
      const plain = isHtmlContent(val) ? stripHtml(val).toLowerCase() : val.toLowerCase();
      return plain.includes(q) || val.toLowerCase().includes(q);
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val).toLowerCase().includes(q);
    }
    if (Array.isArray(val)) {
      return val.some(checkValue);
    }
    if (typeof val === 'object') {
      return Object.values(val).some(checkValue);
    }
    return false;
  };

  if (fieldFilter && fieldFilter !== 'all') {
    const val = getItemFieldValue(itemData, fieldFilter);
    return checkValue(val);
  }

  if (Object.values(itemData).some(checkValue)) {
    return true;
  }

  if (itemData.published?.variations) {
    const unified = unifyParagraphsFromVariations(itemData.published.variations);
    if (checkValue(unified)) return true;
  }

  return false;
}

/**
 * Reconstructs original JSON preserving root structure, metadata, ordering and exact types
 */
export function reconstructJson(
  originalRoot: any,
  collectionPath: string[],
  items: EditableItem[]
): any {
  const cleanCollection = items.map(it => {
    const copy = JSON.parse(JSON.stringify(it.data));
    delete (copy as any)._internalId;
    return copy;
  });

  if (collectionPath.length === 0) {
    return cleanCollection;
  }

  const rootClone = JSON.parse(JSON.stringify(originalRoot));

  let current = rootClone;
  for (let i = 0; i < collectionPath.length - 1; i++) {
    const segment = collectionPath[i];
    if (current[segment] === undefined) {
      current[segment] = {};
    }
    current = current[segment];
  }

  const lastKey = collectionPath[collectionPath.length - 1];
  current[lastKey] = cleanCollection;

  return rootClone;
}
