import { NextRequest, NextResponse } from 'next/server'
import { GET as getTicketHandler } from '../ticket/route'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  url.searchParams.set('id', id)
  const syntheticReq = new NextRequest(url.toString(), {
    headers: request.headers,
    method: 'GET',
  })
  return getTicketHandler(syntheticReq)
}
