// Converts clipboard HTML from Word / Google Docs / web pages into the small set
// of semantic tags the article editor supports. Inline fonts, sizes and colours
// are dropped; headings, bold/italic/underline, lists, links, quotes and remote
// images are kept.

const BLOCK_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE", "PRE", "HR",
  "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "TABLE", "TBODY", "THEAD", "TFOOT", "TR", "TD", "TH",
])
const OUTPUT_BLOCKS = new Set(["P", "H2", "H3", "H4", "UL", "OL", "BLOCKQUOTE", "PRE", "HR", "IMG"])
const SKIP_TAGS = new Set(["STYLE", "SCRIPT", "META", "LINK", "TITLE", "XML", "HEAD", "NOSCRIPT", "SVG", "BUTTON", "INPUT"])

const BOLD = /font-weight\s*:\s*(bold|bolder|[6-9]00)/i
const NOT_BOLD = /font-weight\s*:\s*(normal|lighter|[1-4]00)/i
const ITALIC = /font-style\s*:\s*italic/i
const UNDERLINE = /text-decoration[^;]*underline/i
const LIST_MARKER = /mso-list\s*:\s*ignore/i
const HIDDEN = /display\s*:\s*none/i
const ORDERED_MARKER = /^\(?[0-9a-zA-Z]{1,4}[.)]/

function hasBlockDescendant(el: Element) {
  for (const child of Array.from(el.querySelectorAll("*"))) {
    if (BLOCK_TAGS.has(child.tagName)) return true
  }
  return false
}

function convertChildren(src: Node, dest: Node, doc: Document) {
  for (const child of Array.from(src.childNodes)) convertNode(child, dest, doc)
}

function convertNode(node: Node, dest: Node, doc: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent ?? "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ")
    if (text) dest.appendChild(doc.createTextNode(text))
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return

  const el = node as Element
  const tag = el.tagName.toUpperCase()
  const style = el.getAttribute("style") ?? ""
  if (SKIP_TAGS.has(tag) || HIDDEN.test(style) || LIST_MARKER.test(style)) return
  if (tag.includes(":")) {
    convertChildren(el, dest, doc)
    return
  }

  const make = (name: string) => {
    const out = doc.createElement(name)
    dest.appendChild(out)
    return out
  }

  switch (tag) {
    case "H1":
    case "H2":
      convertChildren(el, make("h2"), doc)
      return
    case "H3":
      convertChildren(el, make("h3"), doc)
      return
    case "H4":
    case "H5":
    case "H6":
      convertChildren(el, make("h4"), doc)
      return
    case "P": {
      const cls = el.getAttribute("class") ?? ""
      if (/MsoTitle/i.test(cls)) return convertChildren(el, make("h2"), doc)
      if (/MsoSubtitle/i.test(cls)) return convertChildren(el, make("h3"), doc)
      if (/MsoListParagraph/i.test(cls) || /mso-list\s*:\s*l\d/i.test(style)) {
        const marker = Array.from(el.querySelectorAll("[style]")).find((n) =>
          LIST_MARKER.test(n.getAttribute("style") ?? ""),
        )
        const p = make("p")
        p.setAttribute("data-list", ORDERED_MARKER.test(marker?.textContent?.trim() ?? "") ? "ol" : "ul")
        convertChildren(el, p, doc)
        return
      }
      convertChildren(el, make("p"), doc)
      return
    }
    case "UL":
    case "OL":
    case "LI":
    case "BLOCKQUOTE":
    case "PRE":
      convertChildren(el, make(tag.toLowerCase()), doc)
      return
    case "HR":
      make("hr")
      return
    case "BR":
      make("br")
      return
    case "A": {
      const href = el.getAttribute("href") ?? ""
      if (/^(https?:|mailto:)/i.test(href)) {
        const a = make("a")
        a.setAttribute("href", href)
        convertChildren(el, a, doc)
      } else {
        convertChildren(el, dest, doc)
      }
      return
    }
    case "IMG": {
      const src = el.getAttribute("src") ?? ""
      if (/^https:\/\//i.test(src)) {
        const img = make("img")
        img.setAttribute("src", src)
        img.setAttribute("alt", el.getAttribute("alt") ?? "")
      }
      return
    }
    case "B":
    case "STRONG":
      convertChildren(el, NOT_BOLD.test(style) ? dest : make("strong"), doc)
      return
    case "I":
    case "EM":
      convertChildren(el, make("em"), doc)
      return
    case "U":
      convertChildren(el, make("u"), doc)
      return
    case "S":
    case "STRIKE":
    case "DEL":
      convertChildren(el, make("s"), doc)
      return
    case "TR":
      convertChildren(el, make("p"), doc)
      return
    case "TD":
    case "TH":
      convertChildren(el, dest, doc)
      dest.appendChild(doc.createTextNode(" "))
      return
    case "DIV":
    case "SECTION":
    case "ARTICLE":
    case "HEADER":
    case "FOOTER":
      convertChildren(el, hasBlockDescendant(el) ? dest : make("p"), doc)
      return
    default: {
      let target: Node = dest
      const wrap = (name: string) => {
        const w = doc.createElement(name)
        target.appendChild(w)
        target = w
      }
      if (BOLD.test(style)) wrap("strong")
      if (ITALIC.test(style)) wrap("em")
      if (UNDERLINE.test(style)) wrap("u")
      convertChildren(el, target, doc)
    }
  }
}

function groupWordLists(root: Element, doc: Document) {
  let list: Element | null = null
  for (const child of Array.from(root.children)) {
    const kind = child.getAttribute("data-list")
    if (child.tagName === "P" && kind) {
      if (!list || list.tagName.toLowerCase() !== kind) {
        list = doc.createElement(kind)
        root.insertBefore(list, child)
      }
      const li = doc.createElement("li")
      while (child.firstChild) li.appendChild(child.firstChild)
      list.appendChild(li)
      child.remove()
    } else {
      list = null
    }
  }
}

function wrapLooseInline(root: Element, doc: Document) {
  let para: Element | null = null
  for (const child of Array.from(root.childNodes)) {
    const isBlock = child.nodeType === Node.ELEMENT_NODE && OUTPUT_BLOCKS.has((child as Element).tagName)
    if (isBlock) {
      para = null
      continue
    }
    if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim() && !para) {
      child.remove()
      continue
    }
    if (!para) {
      para = doc.createElement("p")
      root.insertBefore(para, child)
    }
    para.appendChild(child)
  }
}

function isFullyBold(el: Element) {
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let sawText = false
  while (walker.nextNode()) {
    const text = walker.currentNode
    if (!text.textContent?.trim()) continue
    sawText = true
    if (!text.parentElement?.closest("strong, b")) return false
  }
  return sawText
}

function unwrapBold(el: Element) {
  for (const b of Array.from(el.querySelectorAll("strong, b"))) {
    b.replaceWith(...Array.from(b.childNodes))
  }
}

function tidyBlocks(root: Element, doc: Document) {
  for (const child of Array.from(root.children)) {
    if (child.tagName !== "P") continue
    const text = child.textContent?.replace(/\s+/g, " ").trim() ?? ""
    if (!text && !child.querySelector("img")) {
      child.remove()
      continue
    }
    // Documents often bold a short line instead of using a heading style.
    if (isFullyBold(child)) {
      if (text.length <= 120 && !/[.!?:;,]$/.test(text)) {
        const h = doc.createElement("h3")
        h.textContent = text
        child.replaceWith(h)
      } else {
        unwrapBold(child)
      }
    }
  }
  for (const h of Array.from(root.querySelectorAll("h2, h3, h4"))) {
    unwrapBold(h)
    if (!h.textContent?.trim()) h.remove()
  }
  for (const li of Array.from(root.querySelectorAll("li"))) {
    if (!li.textContent?.trim() && !li.querySelector("img")) li.remove()
  }
  for (const list of Array.from(root.querySelectorAll("ul, ol"))) {
    if (!list.querySelector("li")) list.remove()
  }
}

export function cleanPastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html")
  const out = document.implementation.createHTMLDocument("")
  const root = out.createElement("div")
  convertChildren(parsed.body, root, out)
  groupWordLists(root, out)
  wrapLooseInline(root, out)
  tidyBlocks(root, out)
  return root.innerHTML
}

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("")
}
