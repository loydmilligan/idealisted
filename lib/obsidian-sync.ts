/**
 * Obsidian Sync Service
 *
 * One-way sync from IdeaListed to Obsidian vault
 * Exports notes and projects as markdown files with frontmatter
 *
 * File Organization:
 * /vault-path/
 *   ├── youtube/        (note subtype folders)
 *   ├── research/
 *   ├── meeting/
 *   ├── generic/
 *   ├── media/
 *   └── projects/
 *       ├── Project-Name/
 *       │   ├── _hub.md
 *       │   └── note.md
 *       └── Another-Project/
 *           └── _hub.md
 */

import { db } from './db'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

interface SyncResult {
  success: boolean
  itemsSynced: number
  errors: string[]
  timestamp: number
}

interface SyncableItem {
  id: string
  type: 'note' | 'project'
  text: string
  markdown_content: string | null
  created_at: number
  updated_at: number
  tags: string | null
  subtype: string | null  // For notes
  project_id: string | null  // For notes
  project_name: string | null  // For notes
  status: string | null  // For projects
  description: string | null  // For projects
}

export class ObsidianSyncService {
  private vaultPath: string
  private enabled: boolean
  private lastSync: number

  constructor(vaultPath: string, enabled: boolean = true, lastSync: number = 0) {
    this.vaultPath = vaultPath
    this.enabled = enabled
    this.lastSync = lastSync
  }

  /**
   * Main sync function - exports all new/updated notes and projects
   */
  async sync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      itemsSynced: 0,
      errors: [],
      timestamp: Date.now()
    }

    if (!this.enabled) {
      result.errors.push('Obsidian sync is disabled')
      result.success = false
      return result
    }

    try {
      // Validate vault path exists
      if (!fs.existsSync(this.vaultPath)) {
        result.errors.push(`Vault path does not exist: ${this.vaultPath}`)
        result.success = false
        return result
      }

      // Get items that need syncing (new or updated since last sync)
      const itemsToSync = this.getItemsToSync()

      // Sync each item
      for (const item of itemsToSync) {
        try {
          await this.syncItem(item)
          result.itemsSynced++
        } catch (error) {
          const errorMsg = `Failed to sync item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
          console.error(errorMsg)
          result.errors.push(errorMsg)
        }
      }

      // Update global last sync timestamp if successful
      if (result.itemsSynced > 0 && result.errors.length === 0) {
        this.updateGlobalSyncTimestamp(result.timestamp)
      }

    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error')
    }

    return result
  }

  /**
   * Query database for items that need syncing
   */
  private getItemsToSync(): SyncableItem[] {
    const query = `
      SELECT
        i.id,
        i.type,
        i.text,
        i.markdown_content,
        i.created_at,
        i.updated_at,
        i.tags,
        n.subtype,
        n.project_id,
        p_ref.text as project_name,
        pr.status,
        pr.description
      FROM items i
      LEFT JOIN notes n ON i.id = n.item_id
      LEFT JOIN projects pr ON i.id = pr.item_id
      LEFT JOIN items p_ref ON n.project_id = p_ref.id
      WHERE i.type IN ('note', 'project')
        AND i.archived = 0
        AND (
          i.updated_at > ?
          OR NOT EXISTS (
            SELECT 1 FROM obsidian_sync os WHERE os.item_id = i.id
          )
        )
      ORDER BY i.updated_at DESC
    `

    return db.prepare(query).all(this.lastSync) as SyncableItem[]
  }

  /**
   * Sync a single item (note or project)
   */
  private async syncItem(item: SyncableItem): Promise<void> {
    const filePath = this.getFilePath(item)
    const markdown = this.generateMarkdown(item)
    const fileHash = this.hashContent(markdown)

    // Ensure directory exists
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Write file
    fs.writeFileSync(filePath, markdown, 'utf-8')

    // Update sync tracking
    this.updateSyncTracking(item.id, filePath, fileHash)
  }

  /**
   * Map note subtype to Obsidian folder name
   */
  private mapSubtypeToFolder(subtype: string): string {
    const folderMap: Record<string, string> = {
      'video': 'youtube',      // YouTube videos
      'general': 'generic',    // General notes
      'research': 'research',  // Research notes
      'link': 'links',         // Web links
      'file': 'files',         // File notes
      'contact': 'contacts',   // Contact notes
      'meeting': 'meetings',   // Meeting notes
      'media': 'media'         // Media notes (images, etc.)
    }
    return folderMap[subtype] || 'generic'
  }

  /**
   * Determine file path for an item
   */
  private getFilePath(item: SyncableItem): string {
    const sanitize = (str: string): string => {
      return str
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .substring(0, 50)
    }

    const shortId = item.id.substring(0, 8)
    const safeTitle = sanitize(item.text)
    const filename = `${safeTitle}-${shortId}.md`

    if (item.type === 'note') {
      // Notes organized by subtype or project
      if (item.project_id && item.project_name) {
        // Note belongs to a project - put in project folder
        const safeProjectName = sanitize(item.project_name)
        return path.join(this.vaultPath, 'projects', safeProjectName, filename)
      } else {
        // Standalone note - organize by subtype with folder name mapping
        const subtype = item.subtype || 'general'
        const folderName = this.mapSubtypeToFolder(subtype)
        return path.join(this.vaultPath, folderName, filename)
      }
    } else if (item.type === 'project') {
      // Projects get their own folder with a hub note
      const safeProjectName = sanitize(item.text)
      return path.join(this.vaultPath, 'projects', safeProjectName, '_hub.md')
    }

    // Fallback
    return path.join(this.vaultPath, 'uncategorized', filename)
  }

  /**
   * Generate Obsidian-compatible markdown with frontmatter
   */
  private generateMarkdown(item: SyncableItem): string {
    const tags = item.tags ? JSON.parse(item.tags) : []
    const createdDate = new Date(item.created_at).toISOString()
    const updatedDate = new Date(item.updated_at).toISOString()

    // Build frontmatter
    const frontmatter = [
      '---',
      `id: ${item.id}`,
      `created: ${createdDate}`,
      `updated: ${updatedDate}`,
      tags.length > 0 ? `tags: [${tags.join(', ')}]` : null,
      item.type === 'note' && item.subtype ? `subtype: ${item.subtype}` : null,
      item.type === 'note' && item.project_name ? `project: "[[${item.project_name}]]"` : null,
      item.type === 'project' && item.status ? `status: ${item.status}` : null,
      'source: IdeaListed',
      '---',
      ''
    ].filter(Boolean).join('\n')

    // Use markdown_content if available, otherwise create basic markdown
    let content = item.markdown_content || this.generateBasicMarkdown(item)

    // Add media embeds for YouTube and media notes
    if (item.type === 'note' && (item.subtype === 'video' || item.subtype === 'media')) {
      content = this.addMediaEmbed(content, item.subtype)
    }

    return `${frontmatter}\n${content}`
  }

  /**
   * Add media embed syntax to markdown content
   * Extracts URL field and adds appropriate embed at the top
   */
  private addMediaEmbed(content: string, subtype: string): string {
    // Extract URL field value from markdown
    // Pattern: **URL**: https://example.com/video
    const urlMatch = content.match(/\*\*URL\*\*:\s*(.+)$/m)

    if (!urlMatch || !urlMatch[1].trim()) {
      // No URL found, return content as-is
      return content
    }

    const url = urlMatch[1].trim()

    // Determine embed syntax based on subtype and URL pattern
    let embedCode = ''

    if (subtype === 'video' || url.includes('youtube.com') || url.includes('youtu.be')) {
      // YouTube embed using Media Extended plugin syntax
      embedCode = `![](${url})\n\n`
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      // Image embed
      embedCode = `![](${url})\n\n`
    } else if (url.match(/\.(mp4|webm|mov)$/i)) {
      // Video embed
      embedCode = `![](${url})\n\n`
    } else {
      // Generic media link (not auto-embedded)
      embedCode = `[View Media](${url})\n\n`
    }

    // Insert embed code right after the title (first line starting with #)
    const titleMatch = content.match(/^(#\s+.+)$/m)

    if (titleMatch) {
      const titleEnd = titleMatch.index! + titleMatch[0].length
      return content.slice(0, titleEnd) + '\n\n' + embedCode + content.slice(titleEnd)
    }

    // Fallback: prepend to content
    return embedCode + content
  }

  /**
   * Generate basic markdown for items without markdown_content
   */
  private generateBasicMarkdown(item: SyncableItem): string {
    let markdown = `# ${item.text}\n\n`

    if (item.type === 'project' && item.description) {
      markdown += `## Description\n\n${item.description}\n\n`
    }

    return markdown
  }

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  /**
   * Update sync tracking in database
   */
  private updateSyncTracking(itemId: string, filePath: string, fileHash: string): void {
    db.prepare(`
      INSERT OR REPLACE INTO obsidian_sync (item_id, file_path, file_hash, last_synced_at)
      VALUES (?, ?, ?, ?)
    `).run(itemId, filePath, fileHash, Date.now())
  }

  /**
   * Update global last sync timestamp in settings
   */
  private updateGlobalSyncTimestamp(timestamp: number): void {
    const config = db.prepare('SELECT value FROM settings WHERE key = ?').get('obsidian_config') as any

    if (config) {
      const obsidianConfig = JSON.parse(config.value)
      obsidianConfig.lastSyncTimestamp = timestamp

      db.prepare(`
        INSERT OR REPLACE INTO settings (key, value, updated_at)
        VALUES (?, ?, ?)
      `).run('obsidian_config', JSON.stringify(obsidianConfig), Date.now())
    }
  }

  /**
   * Test if vault path is accessible
   */
  static testVaultPath(vaultPath: string): { valid: boolean; error?: string } {
    try {
      if (!fs.existsSync(vaultPath)) {
        return { valid: false, error: 'Path does not exist' }
      }

      const stats = fs.statSync(vaultPath)
      if (!stats.isDirectory()) {
        return { valid: false, error: 'Path is not a directory' }
      }

      // Test write access
      const testFile = path.join(vaultPath, '.idealisted-test')
      fs.writeFileSync(testFile, 'test')
      fs.unlinkSync(testFile)

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get sync statistics
   */
  static getSyncStats(): { totalSynced: number; lastSync: number | null } {
    const stats = db.prepare(`
      SELECT COUNT(*) as total, MAX(last_synced_at) as last_sync
      FROM obsidian_sync
    `).get() as any

    return {
      totalSynced: stats.total || 0,
      lastSync: stats.last_sync || null
    }
  }
}

/**
 * Factory function to create service from settings
 */
export async function createObsidianSyncService(): Promise<ObsidianSyncService | null> {
  try {
    const config = db.prepare('SELECT value FROM settings WHERE key = ?').get('obsidian_config') as any

    if (!config) {
      return null
    }

    const obsidianConfig = JSON.parse(config.value)

    return new ObsidianSyncService(
      obsidianConfig.vaultPath,
      obsidianConfig.enabled,
      obsidianConfig.lastSyncTimestamp || 0
    )
  } catch (error) {
    console.error('Failed to create ObsidianSyncService:', error)
    return null
  }
}
