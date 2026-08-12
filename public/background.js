chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    console.log('NoteBar extension updated. All storage data preserved.');
  }
});
