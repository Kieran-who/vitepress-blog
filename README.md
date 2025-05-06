# ✨ Vitepress Blog: Your Lightweight Blogging Powerhouse ✨

Unlock the potential of Vitepress with this streamlined blog template! Vitepress
Blog is crafted for simplicity and speed, letting you focus on creating great
content. Built on the lightning-fast Vitepress static site generator, it offers
a smooth and efficient blogging experience.

## Features

- 🚀 **Blazing Fast:** Experience incredible performance thanks to Vitepress and
  Vite.
- 🎨 **Clean & Simple:** A minimalist design puts your content front and center.
- ✍️ **Markdown Mastery:** Full support for standard Markdown, plus MathJax for
  equations and Mermaid for diagrams, right out of the box.
- 🗂️ **Effortless Organization:** Content is automatically organized in the
  sidebar by folder structure and **tags**.
- 📝 **Write Your Way:** Use Obsidian, VS Code, or any Markdown editor you love
  for local writing.
- 🔧 **Fully Extendable:** Tap into the entire Vitepress ecosystem for themes,
  plugins, and advanced customization.

## Get Started

1.  **Clone the Magic:** Grab the repository to your local machine.
2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Launch the Dev Server:** See your blog come to life!

    ```bash
    npm run docs:dev
    ```

4.  **Create New Content Easily:** Use the handy script to scaffold new posts.

    ```bash
    npm run new "Your Post Title Here"
    ```

    This command creates a new Markdown file (e.g., `Your-Post-Title-Here.md`)
    within a `YYYY/MM` directory structure within the `content` folder (like
    `content/2025/may`), pre-filled with default frontmatter and your title.

## Make It Your Own

Dive into the [Vitepress documentation](https://vitepress.dev/) to explore the
customization options available.

### Directory Structure

While the `npm run new` command defaults to a Year/Month structure, feel free to
organize your files within the `content` directory however you see fit! To
maintain post organisation by tag, simply add a `tags` field to the frontmatter
of your Markdown files. For example, the default frontmatter for a new post
using the `npm run new` command looks like this:

```md
---
title: title
date: date # YYYY-MM-DD
outline: deep
tags: tag1, tag2
---

Hello World!
```
