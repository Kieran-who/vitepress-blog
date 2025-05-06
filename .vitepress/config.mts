import { withMermaid } from "vitepress-plugin-mermaid"
import { generateSidebar } from './helpers/sidebar';

// https://vitepress.dev/reference/site-config
export default withMermaid({
  title: "Blog Page Title",

  description: "This is a great place to write a something about your project.",
  srcDir: './content',

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' }
    ],

    search: {
      provider: 'local'
    },
    sidebar: generateSidebar(),

    socialLinks: [
      { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    ],
  },
  cleanUrls: true,
  markdown: {
    math: true,
    image: {
      lazyLoading: true
    }
  },
  mermaid: {}
})
