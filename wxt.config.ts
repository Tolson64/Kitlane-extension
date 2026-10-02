import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // 名称与简介按浏览器语言显示，见 public/_locales/
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: '1.1.0',
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png'
    },
    permissions: [
      'bookmarks',
      'storage',
      'sidePanel',
      'favicon'
    ],
    host_permissions: [
      'https://api.github.com/*',
      'https://raw.githubusercontent.com/*',
      'https://api.deepseek.com/*',
      'https://open.bigmodel.cn/*',
      'https://api.typesafe.ai/*',
      'http://localhost/*',
      'http://127.0.0.1/*'
    ],
    optional_host_permissions: ['https://*/*'],
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    action: {
      default_title: '__MSG_actionTitle__',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png'
      }
    }
  }
});
