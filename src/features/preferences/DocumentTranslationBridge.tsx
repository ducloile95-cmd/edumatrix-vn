import { useEffect } from "react";
import { loadEnglishDictionary, translateToEnglish } from "@/features/preferences/translations";
import type { Language } from "@/features/preferences/appearance";

const TRANSLATED_ATTRIBUTES = ["aria-label", "aria-description", "placeholder", "title"] as const;
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function shouldSkip(element: Element | null): boolean {
  return Boolean(element?.closest('script, style, code, pre, [translate="no"], [data-no-translate]'));
}

function applyTextNode(node: Text, language: Language): void {
  if (!node.data.trim() || shouldSkip(node.parentElement)) return;
  const stored = originalText.get(node);

  if (language === "vi") {
    if (stored !== undefined && node.data !== stored) node.data = stored;
    return;
  }

  if (stored === undefined) {
    originalText.set(node, node.data);
  } else {
    const translatedStored = translateToEnglish(stored);
    if (node.data !== stored && node.data !== translatedStored) originalText.set(node, node.data);
  }

  const source = originalText.get(node) ?? node.data;
  const translated = translateToEnglish(source);
  if (translated !== node.data) node.data = translated;
}

function applyAttributes(element: Element, language: Language): void {
  if (shouldSkip(element)) return;
  let stored = originalAttributes.get(element);
  if (!stored) {
    stored = new Map<string, string>();
    originalAttributes.set(element, stored);
  }

  for (const attribute of TRANSLATED_ATTRIBUTES) {
    const current = element.getAttribute(attribute);
    if (!current) continue;
    const original = stored.get(attribute);

    if (language === "vi") {
      if (original !== undefined && current !== original) element.setAttribute(attribute, original);
      continue;
    }

    if (original === undefined) {
      stored.set(attribute, current);
    } else {
      const translatedOriginal = translateToEnglish(original);
      if (current !== original && current !== translatedOriginal) stored.set(attribute, current);
    }

    const source = stored.get(attribute) ?? current;
    const translated = translateToEnglish(source);
    if (translated !== current) element.setAttribute(attribute, translated);
  }
}

function applyTree(root: Node, language: Language): void {
  if (root.nodeType === Node.TEXT_NODE) applyTextNode(root as Text, language);
  if (root.nodeType === Node.ELEMENT_NODE) applyAttributes(root as Element, language);

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    applyTextNode(textNode as Text, language);
    textNode = textWalker.nextNode();
  }

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let element = elementWalker.nextNode();
  while (element) {
    applyAttributes(element as Element, language);
    element = elementWalker.nextNode();
  }
}

export function DocumentTranslationBridge({ language }: { language: Language }) {
  useEffect(() => {
    const root = document.documentElement;
    let disposed = false;
    let observer: MutationObserver | null = null;

    // Lan dau quet ca trang; sau do chi xu ly dung node vua them/doi (truoc day quet lai ca trang moi khung hinh).
    const start = () => {
      if (disposed) return;
      applyTree(root, language);
      observer = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === "characterData") applyTextNode(record.target as Text, language);
          else if (record.type === "attributes") applyAttributes(record.target as Element, language);
          else record.addedNodes.forEach((node) => applyTree(node, language));
        }
      });
      observer.observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...TRANSLATED_ATTRIBUTES],
      });
    };

    if (language === "en") void loadEnglishDictionary().then(start);
    else start();

    return () => {
      disposed = true;
      observer?.disconnect();
    };
  }, [language]);

  return null;
}
