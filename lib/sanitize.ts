import sanitizeHtml from "sanitize-html"

const HTML_TAG = /<\/?[a-z][\s\S]*>/i

export function isHtml(value: string) {
  return HTML_TAG.test(value)
}

export function sanitizeRichText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "h4",
      "ul", "ol", "li", "blockquote", "a", "img", "hr", "code", "pre", "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["style"],
      p: ["style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }),
    },
  })
}
