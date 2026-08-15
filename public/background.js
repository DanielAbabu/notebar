chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    console.log('NoteBar extension updated. All storage data preserved.');
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  // The alarm name is the task ID
  const taskId = alarm.name;
  
  chrome.storage.local.get(['qn_tasks'], (result) => {
    const tasks = result.qn_tasks || [];
    const task = tasks.find(t => t.id === taskId);
    
    // Only notify if the task exists and is not completed
    if (task && !task.completed) {
      chrome.notifications.create(taskId, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'NoteBar Task Reminder',
        message: task.text,
        priority: 2,
        requireInteraction: true,
        buttons: [
          { title: 'Complete Task' },
          { title: 'Delete Task' }
        ]
      });
    }
  });
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  const taskId = notificationId;
  
  chrome.storage.local.get(['qn_tasks'], (result) => {
    let tasks = result.qn_tasks || [];
    
    if (buttonIndex === 0) { // Complete Task
      tasks = tasks.map(t => t.id === taskId ? { ...t, completed: true } : t);
    } else if (buttonIndex === 1) { // Delete Task
      tasks = tasks.filter(t => t.id !== taskId);
    }
    
    chrome.storage.local.set({ qn_tasks: tasks });
    chrome.alarms.clear(taskId);
    chrome.notifications.clear(taskId);
  });
});

