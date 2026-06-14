import { NextRequest, NextResponse } from 'next/server';
import { getHistory, updateHistoryItem, deleteHistoryItem, toggleHistoryFavorite } from '@/lib/db/sqlite';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;
    const role = session ? session.role : 'guest';

    const history = await getHistory(userId, role, 35);
    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('History GET API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;
    const isAdmin = session ? session.role === 'admin' : false;

    const body = await req.json();
    const { id, question } = body;

    if (!id || !question || typeof question !== 'string' || question.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Missing id or question.' },
        { status: 400 }
      );
    }

    const success = await updateHistoryItem(
      Number(id),
      userId,
      isAdmin,
      question.trim()
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Item not found or permission denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('History PUT API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;
    const isAdmin = session ? session.role === 'admin' : false;

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json(
        { success: false, error: 'Missing history item id.' },
        { status: 400 }
      );
    }

    const id = Number(idStr);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid id parameter.' },
        { status: 400 }
      );
    }

    const success = await deleteHistoryItem(
      id,
      userId,
      isAdmin
    );

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Item not found or permission denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('History DELETE API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing history item id.' },
        { status: 400 }
      );
    }

    const success = await toggleHistoryFavorite(Number(id), userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Item not found or permission denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('History PATCH API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
