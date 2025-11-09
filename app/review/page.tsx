/**
 * Daily Review Screen
 *
 * Displays daily/weekly/monthly activity stats with charts and AI summaries
 * Uses retro Palm Pilot styling with recharts for visualization
 */

'use client'

import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { RetroTabs } from '@/components/ui/RetroTabs'
import Link from 'next/link'

// Types matching lib/review.ts and lib/snapshot.ts
interface DailyStats {
  ideasCreated: number
  ideasSorted: number
  ideasConverted: number
  entityBreakdown: Record<string, number>
  tasksCompleted: number
  tasksDeferred: number
}

interface ProjectSnapshot {
  id: string
  title: string
  status: string
  tasksCompleted: number
  tasksAdded: number
  notesAdded: number
  statusChanged: boolean
}

interface DailySnapshot {
  date: string
  timestamp: number
  stats: DailyStats
  projects: ProjectSnapshot[]
}

interface ReviewData {
  date: string
  snapshot: DailySnapshot
  projectHighlights: string[]
  aiSummary?: string
  highlights: {
    topProjects: Array<{
      id: string
      title: string
      activity: string
    }>
  }
}

type ViewType = 'today' | 'week' | 'month'

// Entity color mapping matching retro theme
// NOTE: These colors are intentionally hardcoded to match the retro Palm Pilot aesthetic
// defined in styles/retro.css. They use muted, desaturated tones for the classic monochrome
// Palm screen look. We cannot use CSS variables here because recharts requires static
// color values for chart rendering.
const ENTITY_COLORS: Record<string, string> = {
  task: '#6B8B9E',     // Muted teal-grey
  note: '#9E8B6B',     // Muted tan-grey
  project: '#7B9E6B',  // Muted sage-grey
  list: '#8B6B9E',     // Muted mauve-grey
  todo: '#8B9E8B',     // Palm screen base
}

export default function ReviewPage() {
  const [viewType, setViewType] = useState<ViewType>('today')
  const [reviewData, setReviewData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Use a date string that matches local timezone to avoid off-by-one errors
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })

  // Load review data
  useEffect(() => {
    loadReviewData()
  }, [selectedDate, viewType])

  const loadReviewData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/review?date=${selectedDate}&includeAI=true`)
      const data = await response.json()

      if (data.success) {
        setReviewData(data.review)
      } else {
        setError(data.error || 'Failed to load review data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data from entity breakdown
  const getChartData = () => {
    if (!reviewData?.snapshot.stats.entityBreakdown) return []

    return Object.entries(reviewData.snapshot.stats.entityBreakdown).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      color: ENTITY_COLORS[type] || '#8B9E8B'
    }))
  }

  const tabs = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' }
  ]

  const chartData = getChartData()

  return (
    <div className="min-h-screen bg-[var(--palm-screen-light)] p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="retro-header retro-header-lg">Daily Review</h1>
            <Link href="/" className="retro-btn retro-btn-secondary">
              Back
            </Link>
          </div>

          {/* Date selector */}
          <div className="retro-card p-3 mb-3">
            <label className="retro-label">Review Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 bg-[var(--palm-bg-secondary)] border border-[var(--palm-border)] text-[var(--palm-text-dark)] font-mono"
            />
          </div>

          {/* Tabs */}
          <RetroTabs
            tabs={tabs}
            activeTab={viewType}
            onTabChange={(id) => setViewType(id as ViewType)}
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="retro-card p-8 text-center">
            <p className="retro-label">Loading review data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="retro-card p-4 border-2 border-[var(--swipe-delete)] mb-4">
            <p className="retro-label text-[var(--swipe-delete)]">Error</p>
            <p className="retro-description">{error}</p>
          </div>
        )}

        {/* Review Content */}
        {!loading && !error && reviewData && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard
                label="Ideas Created"
                value={reviewData.snapshot.stats.ideasCreated}
              />
              <StatCard
                label="Ideas Sorted"
                value={reviewData.snapshot.stats.ideasSorted}
              />
              <StatCard
                label="Ideas Converted"
                value={reviewData.snapshot.stats.ideasConverted}
              />
              <StatCard
                label="Tasks Completed"
                value={reviewData.snapshot.stats.tasksCompleted}
              />
            </div>

            {/* Entity Breakdown Chart */}
            {chartData.length > 0 && (
              <div className="retro-card p-4 mb-4">
                <h2 className="retro-header retro-header-sm mb-3">Entity Breakdown</h2>
                <div
                  style={{ width: '100%', height: 250 }}
                  role="img"
                  aria-label={`Pie chart showing entity breakdown: ${chartData.map(d => `${d.name} ${d.value}`).join(', ')}`}
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--palm-bg-primary)',
                          border: '1px solid var(--palm-border)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Screen reader accessible alternative */}
                <div className="sr-only">
                  <h3>Entity Breakdown Details</h3>
                  <ul>
                    {chartData.map((entry, index) => (
                      <li key={index}>
                        {entry.name}: {entry.value} {entry.value === 1 ? 'item' : 'items'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* AI Project Summary */}
            {reviewData.aiSummary && (
              <div className="retro-card p-4 mb-4 border-2 border-[var(--entity-project)]">
                <h2 className="retro-header retro-header-sm mb-3">AI Summary</h2>
                <p className="retro-description">{reviewData.aiSummary}</p>
              </div>
            )}

            {/* Project Highlights */}
            {reviewData.highlights.topProjects.length > 0 && (
              <div className="retro-card p-4 mb-4">
                <h2 className="retro-header retro-header-sm mb-3">Top Projects</h2>
                <div className="space-y-2">
                  {reviewData.highlights.topProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-3 bg-[var(--palm-bg-secondary)] border border-[var(--palm-border)]"
                    >
                      <div className="retro-item-title mb-1">{proj.title}</div>
                      <div className="retro-meta">{proj.activity}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Project Activity Details */}
            {reviewData.projectHighlights.length > 0 && (
              <div className="retro-card p-4 mb-4">
                <h2 className="retro-header retro-header-sm mb-3">Project Activity</h2>
                <div className="space-y-2">
                  {reviewData.projectHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[var(--palm-bg-secondary)] text-sm"
                    >
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {reviewData.snapshot.stats.ideasCreated === 0 &&
              reviewData.snapshot.stats.tasksCompleted === 0 &&
              reviewData.projectHighlights.length === 0 && (
                <div className="retro-card p-8 text-center">
                  <p className="retro-label mb-2">No activity recorded</p>
                  <p className="retro-description">
                    Start capturing ideas and completing tasks to see your review!
                  </p>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  )
}

// Stat Card Component
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="retro-card p-4 text-center">
      <div className="retro-label text-[var(--palm-text-secondary)] mb-2">
        {label}
      </div>
      <div className="text-3xl font-bold font-mono text-[var(--palm-text-dark)]">
        {value}
      </div>
    </div>
  )
}
