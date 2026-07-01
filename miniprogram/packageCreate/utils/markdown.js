/**
 * 轻量级 Markdown → HTML 转换器
 * 支持：标题、加粗、斜体、行内代码、代码块、列表、链接、图片、分割线、引用
 */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseMarkdown(md) {
  if (!md) return ''

  var lines = md.split('\n')
  var html = []
  var inCodeBlock = false
  var codeContent = []
  var inList = false
  var listType = '' // 'ul' or 'ol'
  var inBlockquote = false

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]

    // 代码块
    if (line.trim().indexOf('```') === 0) {
      if (inCodeBlock) {
        html.push('<pre class="md-code-block"><code>' + escapeHtml(codeContent.join('\n')) + '</code></pre>')
        codeContent = []
        inCodeBlock = false
      } else {
        closeList()
        closeBlockquote()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeContent.push(line)
      continue
    }

    var trimmed = line.trim()

    // 空行
    if (!trimmed) {
      closeList()
      closeBlockquote()
      continue
    }

    // 分割线
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList()
      closeBlockquote()
      html.push('<hr class="md-hr"/>')
      continue
    }

    // 标题
    var headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      closeList()
      closeBlockquote()
      var level = headingMatch[1].length
      html.push('<h' + level + ' class="md-h md-h' + level + '">' + parseInline(headingMatch[2]) + '</h' + level + '>')
      continue
    }

    // 引用
    if (/^>\s?/.test(trimmed)) {
      closeList()
      if (!inBlockquote) {
        html.push('<blockquote class="md-blockquote">')
        inBlockquote = true
      }
      html.push(parseInline(trimmed.replace(/^>\s?/, '')))
      continue
    } else {
      closeBlockquote()
    }

    // 无序列表
    var ulMatch = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeList()
        html.push('<ul class="md-ul">')
        inList = true
        listType = 'ul'
      }
      html.push('<li class="md-li">' + parseInline(ulMatch[1]) + '</li>')
      continue
    }

    // 有序列表
    var olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        html.push('<ol class="md-ol">')
        inList = true
        listType = 'ol'
      }
      html.push('<li class="md-li">' + parseInline(olMatch[2]) + '</li>')
      continue
    }

    // 普通段落
    closeList()
    html.push('<p class="md-p">' + parseInline(trimmed) + '</p>')
  }

  closeList()
  closeBlockquote()
  if (inCodeBlock && codeContent.length > 0) {
    html.push('<pre class="md-code-block"><code>' + escapeHtml(codeContent.join('\n')) + '</code></pre>')
  }

  return html.join('')

  function closeList() {
    if (inList) {
      html.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
      listType = ''
    }
  }

  function closeBlockquote() {
    if (inBlockquote) {
      html.push('</blockquote>')
      inBlockquote = false
    }
  }
}

function parseInline(text) {
  // 先转义HTML实体，防止XSS
  text = escapeHtml(text)
  // 图片
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img class="md-img" src="$2" alt="$1"/>')
  // 链接
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2">$1</a>')
  // 加粗
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="md-bold">$1</strong>')
  text = text.replace(/__(.+?)__/g, '<strong class="md-bold">$1</strong>')
  // 斜体
  text = text.replace(/\*(.+?)\*/g, '<em class="md-italic">$1</em>')
  text = text.replace(/_(.+?)_/g, '<em class="md-italic">$1</em>')
  // 删除线
  text = text.replace(/~~(.+?)~~/g, '<del class="md-del">$1</del>')
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  // 换行
  text = text.replace(/\n/g, '<br/>')

  return text
}

module.exports = {
  parseMarkdown: parseMarkdown
}
