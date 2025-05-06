#!/usr/bin/env node

/**
 * @file new.js
 * @example npm run new "My Blog Post Title"
 *
 * A simple node.js script to scaffold a new blog post in the "content" directory.
 * Expects a single human-readable post title as its argument (E.g. "My Post Title").
 * This generates a new markdown file in the notes directory using the provided
 * title (slugified) as the filename, within subdirectories for month and year. This
 * file will contain some basic YAML frontmatter with the original title and
 * a standardized version of today's date.
 * INSPIRED BY ERIC GARDNER: https://ericgardner.info/notes/blogging-with-vitepress-january-2024
 */

import { writeFile, access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import slugify from 'slugify';

const { log, error } = console;

const CONTENT_DIR = 'content';

// Helper function for consistent error logging and exit
function exitWithError(message) {
  error('Error: ' + message);
  process.exit(1);
}

// Get today's date and month name
const today = new Date();
const monthName = today
  .toLocaleString('en-US', { month: 'long' })
  .toLowerCase();
const year = today.getFullYear();

// --- Argument Parsing ---
// Use process.argv.slice(2) to get arguments excluding node executable and script path
const args = process.argv.slice(2);
if (args.length === 0 || !args[0]) {
  exitWithError('Please provide a title for the post.');
}
const title = args[0];

// --- Filename Generation ---
// Use slugify function and append date components
let baseSlug = slugify(title, {
  lower: true,
  strict: true,
  remove: /[*+~.()'"!:@]/g,
});
const filename = `${year}/${monthName}/${baseSlug}.md`;

// --- File Path Setup ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const blogDir = path.resolve(__dirname, '..', CONTENT_DIR);
const filePath = path.join(blogDir, filename);
const directoryPath = path.dirname(filePath);

// --- Template Setup ---
const template = `---
title: ${title}
date: ${today.toISOString().split('T')[0]}
outline: deep
tags: tag1, tag2
---

Hello world!
`;

// --- File Writing ---
try {
  // Check if file exists
  try {
    await access(filePath, constants.F_OK);
    // If access doesn't throw, the file exists
    exitWithError(`File already exists: ${filename}`);
  } catch (err) {
    // If error code is ENOENT, file doesn't exist, proceed. Otherwise, rethrow.
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // Ensure the directory exists, creating it recursively if necessary
  await mkdir(directoryPath, { recursive: true });

  // Write the file using async writeFile directly
  const data = Buffer.from(template);
  await writeFile(filePath, data);

  log('Created: ' + filename + ' in ' + path.relative(process.cwd(), blogDir));
} catch (err) {
  // Catch errors from access (other than ENOENT), mkdir, or writeFile
  error('Failed to create file or directory: ', err);
  process.exit(1);
}
