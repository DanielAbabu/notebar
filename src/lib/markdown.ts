import { Note } from '../types';

/**
 * Converts Note object into clean Markdown content format.
 */
export function noteToMarkdown(note: Note): string {
  const titleHeader = note.title ? `# ${note.title}\n\n` : '';
  const meta = `> *Last Edited: ${new Date(note.lastEdited).toLocaleString()}*\n\n`;

  if (!note.content) return `${titleHeader}${meta}`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(note.content, 'text/html');

  let markdown = '';

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim() || '';

      if (tag === 'h1') markdown += `# ${text}\n\n`;
      else if (tag === 'h2') markdown += `## ${text}\n\n`;
      else if (tag === 'h3') markdown += `### ${text}\n\n`;
      else if (tag === 'p') markdown += `${text}\n\n`;
      else if (tag === 'ul') {
        el.querySelectorAll('li').forEach((li) => {
          const isTask = li.getAttribute('data-type') === 'taskItem';
          const checked = li.getAttribute('data-checked') === 'true';
          const itemText = li.textContent?.trim() || '';
          if (isTask) {
            markdown += `- [${checked ? 'x' : ' '}] ${itemText}\n`;
          } else {
            markdown += `- ${itemText}\n`;
          }
        });
        markdown += '\n';
      } else if (tag === 'pre' || tag === 'code') {
        markdown += `\`\`\`\n${text}\n\`\`\`\n\n`;
      } else {
        if (text) markdown += `${text}\n\n`;
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const txt = node.textContent?.trim();
      if (txt) markdown += `${txt}\n\n`;
    }
  });

  return `${titleHeader}${meta}${markdown.trim()}`;
}

/**
 * Converts raw Markdown string into HTML paragraph blocks for NoteBar.
 */
export function markdownToHtml(md: string): { title: string; html: string } {
  const lines = md.split('\n');
  let title = '';
  const htmlParts: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('# ') && !title) {
      title = line.substring(2).trim();
      continue;
    }

    if (line.startsWith('## ')) {
      htmlParts.push(`<h2>${escapeHtml(line.substring(3).trim())}</h2>`);
    } else if (line.startsWith('### ')) {
      htmlParts.push(`<h3>${escapeHtml(line.substring(4).trim())}</h3>`);
    } else if (line.startsWith('# ')) {
      htmlParts.push(`<h1>${escapeHtml(line.substring(2).trim())}</h1>`);
    } else if (line.startsWith('- [x] ') || line.startsWith('- [ ] ')) {
      const checked = line.startsWith('- [x] ');
      const text = line.substring(6).trim();
      htmlParts.push(
        `<ul data-type="taskList"><li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"><span></span></label><div><p>${escapeHtml(text)}</p></div></li></ul>`
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      htmlParts.push(`<ul><li><p>${escapeHtml(line.substring(2).trim())}</p></li></ul>`);
    } else {
      htmlParts.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  return {
    title: title || 'Imported Markdown Note',
    html: htmlParts.join('') || '<p></p>',
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
