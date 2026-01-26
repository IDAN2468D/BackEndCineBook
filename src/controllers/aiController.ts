import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import { Showtime } from '../models/Showtime';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * Predicts crowd levels based on movie/showtime data.
 * GET /api/ai/predict-crowd/:tmdbId
 */
export const predictCrowd = async (req: Request, res: Response) => {
    try {
        const { tmdbId } = req.params;

        // 1. Gather Context: Count total bookings for this movie in our DB
        // In a real app, we'd query historical data for this genre/day-of-week
        const matchingShowtimes = await Showtime.find({ tmdbId: Number(tmdbId) });

        let totalSeats = 0;
        let bookedSeats = 0;

        matchingShowtimes.forEach(show => {
            totalSeats += show.seats.length;
            bookedSeats += show.seats.filter((s: any) => s.status === 'booked').length;
        });

        const occupancyRate = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;
        const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const timeOfDay = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // 2. Ask Gemini
        const prompt = `
            Act as a Cinema Analytics Expert.
            Context:
            - Movie TMDB ID: ${tmdbId}
            - Current Occupancy Rate in our system: ${occupancyRate.toFixed(1)}%
            - Day: ${dayOfWeek}
            - Time: ${timeOfDay}
            
            Task: Predict how crowded the cinema will be for a screening of this movie now. 
            If occupancy is low, give a reason why (e.g., "It's a Tuesday morning").
            If high, hype it up.
            
            Output JSON only:
            {
                "crowdPercentage": 45,
                "level": "Moderate",
                "reason": "..."
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(jsonStr));

    } catch (error: any) {
        console.error('AI Crowd Prediction Error:', error);
        res.status(500).json({ message: 'Failed to predict crowd', error: error.message });
    }
};

/**
 * Analyzes review sentiment before saving.
 * POST /api/reviews (Middleware or direct)
 */
export const analyzeReview = async (req: Request, res: Response) => {
    try {
        const { reviewText, rating } = req.body;

        const prompt = `
            Analyze this movie review: "${reviewText}" (Rating: ${rating}/10).
            1. Determine sentiment (Positive/Neutral/Negative).
            2. Extract 3 short tags (e.g., "Great Acting", "Slow Pace").
            
            Output JSON only:
            {
                "sentiment": "Positive",
                "tags": ["Tag1", "Tag2", "Tag3"]
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(jsonStr);

        // In a real flow, we would now save the review + analysis to MongoDB.
        // For now, we return the analysis so the frontend can display "AI Analysis"
        res.json(analysis);

    } catch (error: any) {
        console.error('AI Review Analysis Error:', error);
        res.status(500).json({ message: 'Failed to analyze review', error: error.message });
    }
};
