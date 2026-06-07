import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await verifyAdminRequest(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const booking = await prisma.booking.update({
    where: { id: params.id },
    data: {
      status: body.status,
      adminNotes: body.adminNotes,
      paymentStatus: body.paymentStatus,
    },
  })

  return NextResponse.json(booking)
}
