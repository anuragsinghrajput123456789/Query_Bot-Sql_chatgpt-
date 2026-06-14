import { NextRequest, NextResponse } from 'next/server';
import { runReadOnlyQuery } from '@/lib/db/sqlite';
import { GoogleGenAI } from '@google/genai';

// Try models in order
const MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-2.0-flash'];

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not defined.' },
        { status: 500 }
      );
    }

    // 1. Gather all database statistics
    const [
      totalUsersRaw,
      usersRecentRaw,
      usersPrevRaw,
      totalRevenueRaw,
      revRecentRaw,
      revPrevRaw,
      conversionRateRaw,
      refundRateRaw,
      activeUsersRaw,
      avgCsatRaw,
      openTicketsRaw,
      abuseReportsRaw
    ] = await Promise.all([
      runReadOnlyQuery("SELECT COUNT(*) as count FROM users"),
      runReadOnlyQuery("SELECT COUNT(*) as count FROM users WHERE created_at >= date('2026-06-11', '-30 days')"),
      runReadOnlyQuery("SELECT COUNT(*) as count FROM users WHERE created_at >= date('2026-06-11', '-60 days') AND created_at < date('2026-06-11', '-30 days')"),
      runReadOnlyQuery("SELECT SUM(amount_inr) as revenue, COUNT(*) as count FROM payments WHERE status = 'success'"),
      runReadOnlyQuery("SELECT SUM(amount_inr) as revenue FROM payments WHERE status = 'success' AND created_at >= date('2026-06-11', '-30 days')"),
      runReadOnlyQuery("SELECT SUM(amount_inr) as revenue FROM payments WHERE status = 'success' AND created_at >= date('2026-06-11', '-60 days') AND created_at < date('2026-06-11', '-30 days')"),
      runReadOnlyQuery("SELECT (SELECT COUNT(DISTINCT user_id) FROM subscriptions WHERE status = 'active') * 100.0 / (SELECT COUNT(*) FROM users) as conversion_rate"),
      runReadOnlyQuery("SELECT (SELECT COUNT(*) FROM payments WHERE status = 'refunded') * 100.0 / (SELECT COUNT(*) FROM payments) as refund_rate"),
      runReadOnlyQuery("SELECT COUNT(*) as count FROM users WHERE last_active_at >= date('2026-06-11', '-7 days')"),
      runReadOnlyQuery("SELECT AVG(csat_score) as avg_csat FROM support_tickets WHERE csat_score IS NOT NULL"),
      runReadOnlyQuery("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'"),
      runReadOnlyQuery("SELECT COUNT(*) as count FROM reports WHERE status = 'open'")
    ]);

    const stats = {
      totalUsers: Number(totalUsersRaw[0]?.count || 0),
      usersNew30d: Number(usersRecentRaw[0]?.count || 0),
      usersPrev30d: Number(usersPrevRaw[0]?.count || 0),
      totalRevenue: Number(totalRevenueRaw[0]?.revenue || 0),
      revNew30d: Number(revRecentRaw[0]?.revenue || 0),
      revPrev30d: Number(revPrevRaw[0]?.revenue || 0),
      conversionRate: Math.round(Number(conversionRateRaw[0]?.conversion_rate || 0) * 10) / 10,
      refundRate: Math.round(Number(refundRateRaw[0]?.refund_rate || 0) * 10) / 10,
      activeUsers7d: Number(activeUsersRaw[0]?.count || 0),
      avgCsat: Math.round(Number(avgCsatRaw[0]?.avg_csat || 0) * 10) / 10,
      openTickets: Number(openTicketsRaw[0]?.count || 0),
      abuseReports: Number(abuseReportsRaw[0]?.count || 0)
    };

    // Calculate growth percentages
    const userGrowth = stats.usersPrev30d > 0 
      ? Math.round(((stats.usersNew30d - stats.usersPrev30d) / stats.usersPrev30d) * 100) 
      : stats.usersNew30d > 0 ? 100 : 0;
    const revGrowth = stats.revPrev30d > 0 
      ? Math.round(((stats.revNew30d - stats.revPrev30d) / stats.revPrev30d) * 100) 
      : stats.revNew30d > 0 ? 100 : 0;

    // 2. Format AI Prompts
    const systemInstruction = `
You are the CEO, AI Business Consultant, and Senior Staff Analyst for QueryGPT, a matchmaking and matrimonial web application.
Analyze the provided database statistics and generate a JSON response containing the overall Business Health Score (0-100) and CEO Mode Briefing.

JSON output structure MUST match this exact schema:
{
  "healthScore": 85,
  "breakdown": {
    "revenue": "string describing revenue performance",
    "growth": "string describing user acquisition speed",
    "users": "string describing user profile checks",
    "conversion": "string describing subscription conversion rate",
    "refunds": "string describing payment refund rates",
    "activity": "string describing daily/weekly active users",
    "risk": "string describing active support and abuse reports risk indicators"
  },
  "ceoMode": {
    "executiveSummary": "A highly professional, 2-3 sentence summary briefing for the board.",
    "topKPIs": [
      { "name": "Total Users", "value": "12,431", "change": "+12%" },
      { "name": "Monthly Revenue", "value": "₹45,210", "change": "-4%" }
    ],
    "risks": ["List 2 key risks or bottlenecks"],
    "opportunities": ["List 2 opportunities for user growth or revenue scale"],
    "recommendations": ["List 3 actionable strategic recommendations"],
    "highlights": ["List 2 key milestones or positive callouts"]
  }
}
`;

    const prompt = `
QueryGPT Database Analytics (Matrimonial Platform context):
- Total Registered Users: ${stats.totalUsers}
- New Users (Last 30 days): ${stats.usersNew30d} (Previous 30 days: ${stats.usersPrev30d}, Growth: ${userGrowth > 0 ? '+' : ''}${userGrowth}%)
- Total Revenue Generated: ₹${stats.totalRevenue}
- Monthly Revenue (Last 30 days): ₹${stats.revNew30d} (Previous 30 days: ₹${stats.revPrev30d}, Growth: ${revGrowth > 0 ? '+' : ''}${revGrowth}%)
- Premium Subscription Conversion Rate: ${stats.conversionRate}%
- Refund Rate: ${stats.refundRate}%
- Active Users (Last 7 days): ${stats.activeUsers7d} (${Math.round((stats.activeUsers7d / stats.totalUsers) * 100)}% active)
- Average Support CSAT Score: ${stats.avgCsat} / 5
- Open Support Tickets: ${stats.openTickets}
- Open Abuse Reports: ${stats.abuseReports}
`;

    // Call Gemini
    const ai = new GoogleGenAI({ apiKey });
    let text = '';
    
    for (const model of MODEL_PRIORITY) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });
        text = response.text || '';
        if (text) break;
      } catch (err) {
        console.warn(`Health check model fallback triggered for ${model}:`, err);
      }
    }

    if (!text) {
      throw new Error('All Gemini model queries failed to return health insights.');
    }

    const payload = JSON.parse(text);
    return NextResponse.json({
      success: true,
      stats: {
        ...stats,
        userGrowth,
        revGrowth
      },
      ...payload
    });
  } catch (error) {
    console.error('Health API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
