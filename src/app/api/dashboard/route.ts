import { NextRequest, NextResponse } from 'next/server';
import { getPinnedWidgets, pinWidget, unpinWidget, getHistory } from '@/lib/db/sqlite';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;

    const widgets = await getPinnedWidgets(userId);
    return NextResponse.json({ success: true, widgets });
  } catch (error) {
    console.error('Dashboard GET API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req);
    const userId = session ? session.userId : null;

    const body = await req.json();
    const { action, title, question, sqlQuery, chartType } = body;

    // Handle Auto-Generate action
    if (action === 'auto') {
      // 1. Clear existing pins first
      const existing = await getPinnedWidgets(userId);
      for (const w of existing) {
        await unpinWidget(w.id, userId);
      }

      // 2. Fetch history
      const history = await getHistory(userId, session ? session.role : 'guest', 25);
      
      const pinnedCount = 0;
      const addedTitles = new Set<string>();

      // 3. Pin unique history items (up to 4)
      for (const item of history) {
        if (addedTitles.size >= 4) break;
        if (addedTitles.has(item.question.toLowerCase())) continue;
        
        // Auto select a chart type based on query fields
        let cType = 'table';
        const queryUpper = item.sql_query.toUpperCase();
        if (queryUpper.includes('COUNT(') || queryUpper.includes('SUM(')) {
          cType = queryUpper.includes('GROUP BY') ? 'bar' : 'kpi';
        }
        if (queryUpper.includes('DATE') || queryUpper.includes('CREATED_AT') || queryUpper.includes('TIMESTAMP')) {
          cType = 'line';
        }

        await pinWidget(
          userId,
          item.question,
          item.question,
          item.sql_query,
          cType
        );
        addedTitles.add(item.question.toLowerCase());
      }

      // 4. Seed default widgets if history had less than 4 unique queries
      const defaults = [
        {
          title: 'Total Revenue generated',
          question: 'What is the total revenue?',
          sql: "SELECT SUM(amount_inr) as total_revenue FROM payments WHERE status = 'success'",
          chart: 'kpi'
        },
        {
          title: 'User registrations by City',
          question: 'Show users count by city',
          sql: 'SELECT city, COUNT(*) as user_count FROM users GROUP BY city ORDER BY user_count DESC LIMIT 8',
          chart: 'bar'
        },
        {
          title: 'Active Premium Subscriptions',
          question: 'How many active subscriptions exist?',
          sql: "SELECT COUNT(*) as active_count FROM subscriptions WHERE status = 'active'",
          chart: 'kpi'
        },
        {
          title: 'Monthly Subscription Signups',
          question: 'Show subscriptions by start date month',
          sql: "SELECT strftime('%Y-%m', start_date) as month, COUNT(*) as signup_count FROM subscriptions GROUP BY month ORDER BY month DESC LIMIT 6",
          chart: 'line'
        }
      ];

      for (const def of defaults) {
        if (addedTitles.size >= 4) break;
        if (addedTitles.has(def.question.toLowerCase())) continue;

        await pinWidget(userId, def.title, def.question, def.sql, def.chart);
        addedTitles.add(def.question.toLowerCase());
      }

      const widgets = await getPinnedWidgets(userId);
      return NextResponse.json({ success: true, widgets });
    }

    // Standard Widget Pinning
    if (!title || !question || !sqlQuery || !chartType) {
      return NextResponse.json(
        { success: false, error: 'Missing widget details.' },
        { status: 400 }
      );
    }

    const id = await pinWidget(userId, title, question, sqlQuery, chartType);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Dashboard POST API Error:', error);
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

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json(
        { success: false, error: 'Missing widget id.' },
        { status: 400 }
      );
    }

    const id = Number(idStr);
    const success = await unpinWidget(id, userId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Widget not found or permission denied.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dashboard DELETE API Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
