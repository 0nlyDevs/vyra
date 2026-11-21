// Menu du clic droit : un texte sélectionné, un lien ou une image part dans le panneau latéral.
// Rien n'est envoyé à la plateforme avant que la personne clique sur « Vérifier ce contenu ».

const MENUS = [
  { id: 'check-selection', title: 'Vérifier ce texte', contexts: ['selection'] },
  { id: 'check-link', title: 'Vérifier ce lien', contexts: ['link'] },
  { id: 'check-image', title: 'Examiner cette image', contexts: ['image'] },
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const menu of MENUS) chrome.contextMenus.create(menu);
  });
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  let pending = null;
  if (info.menuItemId === 'check-selection' && info.selectionText) {
    pending = { kind: 'text', text: info.selectionText.slice(0, 3000), pageUrl: info.pageUrl ?? '' };
  } else if (info.menuItemId === 'check-link' && info.linkUrl) {
    pending = { kind: 'link', url: info.linkUrl, pageUrl: info.pageUrl ?? '' };
  } else if (info.menuItemId === 'check-image' && info.srcUrl) {
    pending = { kind: 'image', url: info.srcUrl, pageUrl: info.pageUrl ?? '' };
  }
  if (!pending || !tab?.id) return;
  // Ouvrir le panneau tout de suite : Chrome ne l'accepte que pendant le clic.
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.storage.session.set({ pending: { ...pending, at: Date.now() } });
});
