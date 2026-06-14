import { NextRequest, NextResponse } from 'next/server';
import { runReadOnlyQuery } from '@/lib/db/sqlite';
import { GoogleGenAI } from '@google/genai';

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

    // 1. Fetch historical payment data by month
    const history = await runReadOnlyQuery(`
      SELECT strftime('%Y-%m', created_at) as date, SUM(amount_inr) as revenue
      FROM payments
      WHERE status = 'success'
      GROUP BY date
      ORDER BY date ASC
    `);

    if (history.length === 0) {
      return NextResponse.json({
        success: true,
        forecast: [
          { date: '2026-06', actual: 0, forecast: 0 },
          { date: '2026-07', forecast: 1000 },
          { date: '2026-08', forecast: 2500 },
          { date: '2026-09', forecast: 4000 }
        ]
      });
    }

    // 2. Instruct Gemini to forecast next week, month, and quarter based on history
    const systemInstruction = `
You are an expert financial analyst and time-series forecaster.
Analyze the provided monthly revenue dataset of a matrimonial platform and project:
1. Next week's revenue.
2. Next month's revenue.
3. Next quarter's revenue.
Also, generate a list of 4 forecasted future points starting right after the last historical month.
Format the output as a JSON object matching this schema:
{
  "nextWeekForecast": 12500,
  "nextMonthForecast": 48000,
  "nextQuarterForecast": 150000,
  "forecastedPoints": [
    { "date": "YYYY-MM", "revenue": 14000 },
    { "date": "YYYY-MM", "revenue": 16000 }
  ]
}
`;

    const prompt = `
Matrimonial platform historical monthly successful payments (in INR):
${JSON.stringify(history, null, 2)}

Please forecast future performance starting after the last date: ${history[history.length - 1].date}.
`;

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
        console.warn(`Forecast model fallback triggered:`, err);
      }
    }

    if (!text) {
      throw new Error('Gemini forecasting API failed.');
    }

    const payload = JSON.parse(text);

    // 3. Assemble unified chart data
    const chartData: any[] = history.map((h: any) => ({
      date: h.date,
      actual: h.revenue,
      forecast: null
    }));

    // Connect forecast line to last actual point
    if (chartData.length > 0) {
      chartData[chartData.length - 1].forecast = chartData[chartData.length - 1].actual;
    }

    // Append forecast points
    if (Array.isArray(payload.forecastedPoints)) {
      payload.forecastedPoints.forEach((pt: any) => {
        chartData.push({
          date: pt.date,
          actual: null,
          forecast: pt.revenue
        });
      });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        nextWeek: payload.nextWeekForecast,
        nextMonth: payload.nextMonthForecast,
        nextQuarter: payload.nextQuarterForecast
      },
      forecast: chartData
    });
  } catch (error) {
    console.error('Forecast API error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
