import { GoogleGenerativeAI } from '@google/generative-ai';
import { Request, Response } from 'express';
import { Showtime } from '../models/Showtime';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

import axios from 'axios';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

/**
 * Summarizes all reviews for a movie.
 * GET /api/ai/summarize-reviews/:tmdbId
 */
export const summarizeReviews = async (req: Request, res: Response) => {
    try {
        const { tmdbId } = req.params;

        // 1. Fetch Reviews from TMDB
        const tmdbResponse = await axios.get(
            `https://api.themoviedb.org/3/movie/${tmdbId}/reviews?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        const reviews = tmdbResponse.data.results;

        if (!reviews || reviews.length === 0) {
            return res.json({ summary: "No reviews available yet to summarize." });
        }

        // Limit to first 10 reviews to save tokens
        const reviewsText = reviews.slice(0, 10).map((r: any) => `- ${r.content.substring(0, 300)}...`).join('\n');

        // 2. Ask Gemini
        const prompt = `
            Summarize these movie reviews into one single, punchy paragraph (max 3 sentences).
            Highlight the consensus on acting, plot, and special effects.
            
            Reviews:
            ${reviewsText}
            
            Output JSON only:
            {
                "summary": "Most viewers agreed that..."
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(jsonStr));

    } catch (error: any) {
        console.error('AI Review Summary Error:', error);
        res.status(500).json({ message: 'Failed to summarize reviews', error: error.message });
    }
};

/**
 * Chat with CineBot.
 * POST /api/ai/chat
 */
export const chatWithCineBot = async (req: Request, res: Response) => {
    try {
        const { message, history } = req.body;

        // Construct history string
        const conversationHistory = history?.map((h: any) => `${h.role === 'user' ? 'User' : 'CineBot'}: ${h.text}`).join('\n') || '';

        const prompt = `
            Act as CineBot, a helpful and enthusiastic cinema assistant for CineBook.
            You help users find movies, check showtimes, and answer cinema questions.
            Keep answers short, fun, and emoji-friendly.
            
            Conversation History:
            ${conversationHistory}
            
            User: ${message}
            CineBot:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text.trim() });

    } catch (error: any) {
        console.error('CineBot Chat Error:', error);
        res.status(500).json({ message: 'CineBot is sleeping...', error: error.message });
    }
};

/**
 * Generates a thematic date night plan based on the movie.
 * POST /api/ai/date-night
 */
export const planDateNight = async (req: Request, res: Response) => {
    try {
        const { movieTitle, genre, vibe } = req.body;

        const prompt = `
            Plan a creative date night itinerary centered around watching the movie "${movieTitle}" (${genre}).
            Use the movie's vibe (${vibe || 'general'}) to suggest:
            1. A pre-movie dinner cuisine/vibe.
            2. A post-movie activity.
            3. A fun conversation starter related to the movie themes.

            Output JSON only:
            {
                "dinner": "...",
                "activity": "...",
                "conversation": "..."
            }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        res.json(JSON.parse(jsonStr));

    } catch (error: any) {
        console.error('Date Night Plan Error:', error);
        res.status(500).json({ message: 'Failed to plan date', error: error.message });
    }
};
