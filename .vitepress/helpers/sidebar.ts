import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { DefaultTheme } from 'vitepress';

// --- Configuration ---
const contentRoot = path.resolve(__dirname, '../../content'); // Path relative to this helper file
const contentBaseUrl = '/'; // Base URL path for the root of the content
// ---------------------

/**
 * Cleans up file/directory names for display text.
 * Removes ordering prefixes, extensions, replaces separators, and title-cases.
 */
function cleanName(name: string): string {
    let cleaned = name.replace(/\.\w+$/, ''); // Remove extension
    cleaned = cleaned.replace(/^(\d+[_-]|[_-])/, ''); // Remove ordering prefixes
    cleaned = cleaned.replace(/[-_]/g, ' '); // Replace separators with space
    cleaned = cleaned.replace(/\b\w/g, char => char.toUpperCase()); // Title Case
    return cleaned.trim() || name; // Return cleaned or original if empty
}

/**
 * Generates the correct URL link for a given markdown file path and its base URL.
 * Handles index/readme files appropriately.
 * @param filePath Relative file path from the directory being scanned (e.g., 'my-doc.md', 'index.md').
 * @param baseUrl The base URL for the directory containing the file (e.g., '/guide/', '/'). Must end with '/'.
 * @returns The calculated URL string.
 */
function getFileLink(filePath: string, baseUrl: string): string {
    const fileExtension = path.extname(filePath);
    const fileNameWithoutExtension = filePath.substring(0, filePath.length - fileExtension.length);

    if (/^(index|readme)$/i.test(fileNameWithoutExtension)) {
        // Index/readme file maps to the directory's base URL
        // Ensure root index maps correctly (e.g., /index/ -> /)
        return baseUrl === `${contentBaseUrl}index/` ? contentBaseUrl : baseUrl;
    } else {
        // Other files map to base URL + filename (no extension)
        return `${baseUrl}${fileNameWithoutExtension}`;
    }
}

/**
 * Generates sidebar items recursively for a given directory (structure-based).
 * @param dirPath Absolute path to the directory being scanned.
 * @param baseUrl The corresponding base URL path for this directory. Must end with '/'.
 * @returns An array of sidebar items (files and sub-directory groups).
 */
function generateSidebarItems(dirPath: string, baseUrl: string): DefaultTheme.SidebarItem[] {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return [];
    }
    if (!baseUrl.endsWith('/')) {
        console.warn(`[Sidebar] Base URL passed to generateSidebarItems should end with a slash: ${baseUrl}`);
        baseUrl += '/';
    }

    const items: DefaultTheme.SidebarItem[] = [];
    try {
        const entries = fs.readdirSync(dirPath);

        // Sort entries: index/readme.md first, then directories, then other files alphabetically
        entries.sort((a, b) => {
            const fullPathA = path.join(dirPath, a);
            const fullPathB = path.join(dirPath, b);
            const isIndexA = /^(index|readme)\.md$/i.test(a);
            const isIndexB = /^(index|readme)\.md$/i.test(b);
            if (isIndexA !== isIndexB) return isIndexA ? -1 : 1;
            try {
                const statA = fs.statSync(fullPathA);
                const statB = fs.statSync(fullPathB);
                const isDirA = statA.isDirectory();
                const isDirB = statB.isDirectory();
                if (isDirA !== isDirB) return isDirA ? -1 : 1; // Dirs before files
            } catch { /* ignore stat errors during sort */ }
            return a.localeCompare(b);
        });

        entries.forEach(entry => {
            if (entry.startsWith('.')) return; // Skip hidden

            const fullPath = path.join(dirPath, entry);
            let stats;
            try { stats = fs.statSync(fullPath); } catch (err) {
                console.error(`[Sidebar] Error stating file/dir ${fullPath}:`, err);
                return;
            }

            if (stats.isDirectory()) {
                const subDirBaseUrl = `${baseUrl}${entry}/`;
                const subItems = generateSidebarItems(fullPath, subDirBaseUrl);
                if (subItems.length > 0) {
                    items.push({
                        text: cleanName(entry),
                        items: subItems,
                        collapsed: true,
                    });
                }
            } else if (stats.isFile() && entry.toLowerCase().endsWith('.md')) {
                // Handle Markdown files
                const link = getFileLink(entry, baseUrl);
                // Use frontmatter title if available, otherwise cleaned filename
                let text = cleanName(entry); // Default to cleaned filename
                try {
                    const fileContent = fs.readFileSync(fullPath, 'utf-8');
                    const { data: frontmatter } = matter(fileContent);
                    if (typeof frontmatter.title === 'string' && frontmatter.title.trim()) {
                        text = frontmatter.title.trim();
                    }
                } catch (err) {
                    console.error(`[Sidebar] Error reading frontmatter for ${fullPath}:`, err);
                }

                items.push({
                    text: text,
                    link: link
                });
            }
        });
    } catch (err) {
        console.error(`[Sidebar] Error reading directory ${dirPath}:`, err);
    }
    return items;
}


// --- Tag Generation ---
/**
 * Data structure for storing page info associated with a tag.
 */
interface TagPageInfo {
    link: string;
    text: string;
    relativePath: string;
}

/**
 * Scans directories recursively to find all markdown files and extracts their tags.
 * @param dirPath Absolute path to the directory to scan.
 * @param baseUrl The corresponding base URL path for this directory. Must end with '/'.
 * @param tagsMap A Map to accumulate tag data. Key: tag name, Value: array of TagPageInfo.
 * @param scanRoot The absolute path to the root content directory being scanned.
 */
function scanFilesForTags(
    dirPath: string,
    baseUrl: string,
    tagsMap: Map<string, TagPageInfo[]>,
    scanRoot: string
): void {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        return;
    }
    if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
    }

    try {
        const entries = fs.readdirSync(dirPath);
        entries.forEach(entry => {
            if (entry.startsWith('.')) return; // Skip hidden

            const fullPath = path.join(dirPath, entry);
            let stats;
            try { stats = fs.statSync(fullPath); } catch { return; } // Skip if cannot stat

            if (stats.isDirectory()) {
                // Recursively scan subdirectories
                scanFilesForTags(fullPath, `${baseUrl}${entry}/`, tagsMap, scanRoot);
            } else if (stats.isFile() && entry.toLowerCase().endsWith('.md')) {
                try {
                    const fileContent = fs.readFileSync(fullPath, 'utf-8');
                    const { data: frontmatter } = matter(fileContent); // Parse frontmatter

                    // Handle tags defined as string (comma-separated) or array
                    let fileTags: string[] = [];
                    if (frontmatter.tags) {
                        if (typeof frontmatter.tags === 'string') {
                            fileTags = frontmatter.tags.split(',').map(t => t.trim()).filter(Boolean);
                        } else if (Array.isArray(frontmatter.tags)) {
                            fileTags = frontmatter.tags.map(t => String(t).trim()).filter(Boolean);
                        }
                    }

                    if (fileTags.length > 0) {
                        const link = getFileLink(entry, baseUrl);
                        // Use frontmatter title if available and non-empty, otherwise use cleaned filename
                        const text = typeof frontmatter.title === 'string' && frontmatter.title.trim()
                            ? frontmatter.title.trim()
                            : cleanName(entry);
                        // Calculate path relative to the root directory scanned for tags
                        const relativePath = path.relative(scanRoot, fullPath).replace(/\\/g, '/'); // Normalize slashes

                        fileTags.forEach(tag => {
                            const tagName = tag.trim();
                            if (!tagsMap.has(tagName)) {
                                tagsMap.set(tagName, []);
                            }
                            const tagPages = tagsMap.get(tagName)!;
                            // Avoid adding duplicates if a file is somehow processed twice
                            if (!tagPages.some(item => item.link === link)) {
                                tagPages.push({ link, text, relativePath });
                            }
                        });
                    }
                } catch (err) {
                    console.error(`[Sidebar Tags] Error processing file ${fullPath}:`, err);
                }
            }
        });
    } catch (err) {
        console.error(`[Sidebar Tags] Error reading directory ${dirPath}:`, err);
    }
}

/**
 * Sorts sidebar items: directories first, then files, alphabetically by text.
 */
function sidebarItemSorter(a: DefaultTheme.SidebarItem, b: DefaultTheme.SidebarItem): number {
    const isDirA = !!a.items;
    const isDirB = !!b.items;
    if (isDirA !== isDirB) {
        return isDirA ? -1 : 1; // Directories first
    }
    // Both are dirs or both are files, sort by text
    return (a.text ?? '').localeCompare(b.text ?? '');
}

/**
 * Recursively inserts a page into the correct position within a nested sidebar structure.
 * Creates directory groups as needed.
 * @param parentItems The array of sidebar items at the current level.
 * @param segments Path segments relative to the tag root (e.g., ['2025', 'march', 'someFile.md']).
 * @param pageLink The final link for the page.
 * @param pageText The display text for the page (file item).
 */
function insertPageIntoStructure(
    parentItems: DefaultTheme.SidebarItem[],
    segments: string[],
    pageLink: string,
    pageText: string
): void {
    if (!segments || segments.length === 0) return;

    const currentSegment = segments[0];
    const isFile = segments.length === 1;

    if (isFile) {
        // It's the file segment. Add the file item.
        // Use pageText provided (could be title or cleaned name).
        // Avoid adding duplicates.
        if (!parentItems.some(item => item.link === pageLink)) {
            parentItems.push({ text: pageText, link: pageLink });
            parentItems.sort(sidebarItemSorter); // Sort after adding file
        }
    } else {
        // It's a directory segment.
        const dirName = cleanName(currentSegment); // Use cleaned name for directory text
        let dirItem = parentItems.find(item => item.text === dirName && item.items); // Find existing directory group

        if (!dirItem) {
            // Create new directory group if it doesn't exist
            dirItem = { text: dirName, items: [], collapsed: true };
            parentItems.push(dirItem);
            parentItems.sort(sidebarItemSorter); // Sort after adding new directory
        }

        // Recurse into the directory's items array with the remaining segments
        insertPageIntoStructure(dirItem.items!, segments.slice(1), pageLink, pageText);
    }
}


/**
 * Generates the "Tags" sidebar group, organizing pages under each tag
 * according to their directory structure.
 * @param scanRoot The absolute path to the root content directory to scan.
 * @param baseUrl The base URL corresponding to the scanRoot.
 * @returns A SidebarItem representing the "Tags" group, or null if no tags found.
 */
function generateTagsSidebarGroup(scanRoot: string, baseUrl: string): DefaultTheme.SidebarItem | null {
    const tagsMap = new Map<string, TagPageInfo[]>();
    // Scan files, passing scanRoot to calculate relative paths correctly
    scanFilesForTags(scanRoot, baseUrl, tagsMap, scanRoot);

    if (tagsMap.size === 0) {
        return null; // No tags found
    }

    // Sort tags alphabetically
    const sortedTags = Array.from(tagsMap.keys()).sort((a, b) => a.localeCompare(b));

    // Build the items for the main "Tags" group
    const tagItems: DefaultTheme.SidebarItem[] = sortedTags.map(tag => {
        const pages = tagsMap.get(tag) || [];
        // This will hold the structured items (dirs and files) for the current tag
        const tagRootItems: DefaultTheme.SidebarItem[] = [];

        // Process each page associated with the current tag
        pages.forEach(page => {
            // Split the relative path into directory/file segments            
            const segments = page.relativePath.split('/').filter(Boolean); // Filter out empty strings

            if (segments.length > 0) {
                // Insert the page into the structure, creating directories as needed
                insertPageIntoStructure(tagRootItems, segments, page.link, page.text);
            }
        });

        // Create the sidebar item for this specific tag
        return {
            text: tag, // Use the tag name as the group text
            items: tagRootItems, // Assign the generated nested structure
            collapsed: true,
        };
    });

    // Return the main "Tags" group containing all tag structures
    return {
        text: 'Tags',
        items: tagItems,
        collapsed: true,
    };
}


/**
 * Generates the complete VitePress sidebar configuration object.
 * Includes structure-based items and optionally a tag-based group.
 * @param scanRoot - The absolute path to the root directory containing content folders.
 * @param baseUrl - The base URL corresponding to the scanRoot.
 * @param includeTags - Whether to include the 'Tags' section. Defaults to true.
 * @returns The sidebar configuration object (`DefaultTheme.Sidebar`).
 */
export function generateSidebar(
    scanRoot: string = contentRoot,
    baseUrl: string = contentBaseUrl,
    includeTags: boolean = true
): DefaultTheme.Sidebar {

    const sidebarItems: DefaultTheme.SidebarItem[] = [];

    // Generate items based on content directory structure
    try {
        const topLevelEntries = fs.readdirSync(scanRoot);
        topLevelEntries.forEach(entry => {
            if (entry.startsWith('.')) return; // Skip hidden

            const groupDirPath = path.join(scanRoot, entry);
            let stats;
            try { stats = fs.statSync(groupDirPath); } catch { return; } // Skip if cannot stat

            if (stats.isDirectory()) {
                // Base URL for links within this top-level group
                const groupBaseUrl = `${baseUrl}${entry}/`.replace(/\/+/g, '/');
                const groupItems = generateSidebarItems(groupDirPath, groupBaseUrl);

                if (groupItems.length > 0) {
                    sidebarItems.push({
                        text: cleanName(entry), // Use cleaned directory name as group title
                        items: groupItems,
                        collapsed: true,
                    });
                }
            }
            // Ignore top-level files for the main structure sidebar
        });

        // Sort top-level groups alphabetically by text
        sidebarItems.sort((a, b) => (a.text ?? '').localeCompare(b.text ?? ''));

    } catch (err) {
        console.error(`[Sidebar] Error reading root content directory ${scanRoot}:`, err);
    }

    // Generate and potentially add the Tags group
    let allSidebarItems = [...sidebarItems]; // Start with structure-based items
    if (includeTags) {
        const tagsGroup = generateTagsSidebarGroup(scanRoot, baseUrl);
        if (tagsGroup) {
            allSidebarItems.push(tagsGroup);
        }
    }

    // Return the final sidebar object, keyed by the base path
    return {
        '/': allSidebarItems
    };
}