const { contextBridge, ipcRenderer } = require('electron');

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件对话框
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),
  writeFile: (filePath, content, encoding) => ipcRenderer.invoke('file:write', filePath, content, encoding),

  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('app:getInfo'),

  // 事件监听
  onMenuAction: (callback) => {
    ipcRenderer.on('menu:action', (event, action) => callback(action));
  }
});
