import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { parseISO } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const blocked = await prisma.blockedDate.create({
    data: {
      roomId: params.id,
      dateFrom: parseISO(body.dateFrom),
      dateTo: parseISO(body.dateTo),
      reason: body.reason || null,
    },
  })
  return NextResponse.json(blocked)
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const blocked = await prisma.blockedDate.findMany({
    where: { roomId: params.id, dateTo: { gte: new Date() } },
    orderBy: { dateFrom: 'asc' },
  })
  return NextResponse.json(blocked)
}
