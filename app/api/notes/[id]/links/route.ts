import { NextRequest, NextResponse } from 'next/server'
import { noteLinkingService } from '@/lib/note-linking'

/**
 * GET /api/notes/[id]/links
 * Get link suggestions for a note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const noteId = params.id
    const { searchParams } = new URL(request.url)
    const maxSuggestions = parseInt(searchParams.get('max') || '5')
    const minConfidence = parseFloat(searchParams.get('confidence') || '0.6')
    const autoApply = searchParams.get('autoApply') === 'true'

    const result = await noteLinkingService.suggestLinks(noteId, {
      maxSuggestions,
      minConfidence,
      autoApply
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error suggesting links:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notes/[id]/links
 * Approve or reject a suggested link
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sourceNoteId = params.id
    const body = await request.json()
    const { targetNoteId, action } = body

    if (!targetNoteId || !action) {
      return NextResponse.json(
        { success: false, error: 'targetNoteId and action are required' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      noteLinkingService.approveLink(sourceNoteId, targetNoteId)
    } else if (action === 'reject') {
      noteLinkingService.rejectLink(sourceNoteId, targetNoteId)
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Use "approve" or "reject"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating link:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
