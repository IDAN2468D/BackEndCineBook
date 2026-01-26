import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { googleLogin, login, register } from './src/controllers/authController';
import { authMiddleware } from './src/middleware/authMiddleware';
import { Showtime } from './src/models/Showtime';

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initSocket } from './src/sockets/socketHandler';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: "*", // Allow all origins for mobile app access
        methods: ["GET", "POST"]
    }
});

// Initialize Socket Logic
initSocket(io);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook';

import axios from 'axios';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Database Connection
mongoose.set('strictPopulate', false);
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/google', googleLogin);

app.get('/api/movies', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Fetch Error:', error.message);
        res.status(500).json({ message: 'Error fetching movies from TMDB' });
    }
});

app.get('/api/movies/upcoming', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/upcoming?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Upcoming Error:', error.message);
        res.status(500).json({ message: 'Error fetching upcoming movies' });
    }
});

app.get('/api/movies/trending', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Trending Error:', error.message);
        res.status(500).json({ message: 'Error fetching trending movies' });
    }
});

app.get('/api/movie/:tmdbId', async (req, res) => {
    try {
        const { tmdbId } = req.params;

        // Fetch movie details, videos, and credits in parallel
        const [detailsRes, videosRes, creditsRes] = await Promise.all([
            axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`),
            axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_API_KEY}&language=en-US`),
            axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_API_KEY}`)
        ]);

        res.json({
            ...detailsRes.data,
            videos: videosRes.data.results,
            cast: creditsRes.data.cast.slice(0, 10),
            crew: creditsRes.data.crew.slice(0, 5)
        });
    } catch (error: any) {
        console.error('TMDB Movie Details Error:', error.message);
        res.status(500).json({ message: 'Error fetching movie details' });
    }
});

app.get('/api/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const response = await axios.get(
            `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Search Error:', error.message);
        res.status(500).json({ message: 'Error searching movies' });
    }
});

// --- NEW TMDB EXPANSION ENDPOINTS ---

// 1. More Movie Lists
app.get('/api/movies/top-rated', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Top Rated Error:', error.message);
        res.status(500).json({ message: 'Error fetching top rated movies' });
    }
});

app.get('/api/movies/popular', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Popular Movies Error:', error.message);
        res.status(500).json({ message: 'Error fetching popular movies' });
    }
});

// 2. TV Shows Support
app.get('/api/tv/popular', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB TV Popular Error:', error.message);
        res.status(500).json({ message: 'Error fetching popular TV shows' });
    }
});

app.get('/api/tv/top-rated', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB TV Top Rated Error:', error.message);
        res.status(500).json({ message: 'Error fetching top rated TV shows' });
    }
});

app.get('/api/tv/on-the-air', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB TV On The Air Error:', error.message);
        res.status(500).json({ message: 'Error fetching on-the-air TV shows' });
    }
});

app.get('/api/tv/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [details, credits, videos] = await Promise.all([
            axios.get(`https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}&language=en-US`),
            axios.get(`https://api.themoviedb.org/3/tv/${id}/credits?api_key=${TMDB_API_KEY}&language=en-US`),
            axios.get(`https://api.themoviedb.org/3/tv/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
        ]);

        res.json({
            ...details.data,
            cast: credits.data.cast.slice(0, 10),
            videos: videos.data.results
        });
    } catch (error: any) {
        console.error('TMDB TV Details Error:', error.message);
        res.status(500).json({ message: 'Error fetching TV show details' });
    }
});

// 3. People (Actors/Directors)
app.get('/api/people/popular', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/person/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        res.json(response.data.results);
    } catch (error: any) {
        console.error('TMDB Popular People Error:', error.message);
        res.status(500).json({ message: 'Error fetching popular people' });
    }
});

app.get('/api/person/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [details, combinedCredits] = await Promise.all([
            axios.get(`https://api.themoviedb.org/3/person/${id}?api_key=${TMDB_API_KEY}&language=en-US`),
            axios.get(`https://api.themoviedb.org/3/person/${id}/combined_credits?api_key=${TMDB_API_KEY}&language=en-US`)
        ]);

        res.json({
            ...details.data,
            credits: combinedCredits.data
        });
    } catch (error: any) {
        console.error('TMDB Person Details Error:', error.message);
        res.status(500).json({ message: 'Error fetching person details' });
    }
});

// 4. Genres
app.get('/api/genres/movies', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`
        );
        res.json(response.data.genres);
    } catch (error: any) {
        console.error('TMDB Movie Genres Error:', error.message);
        res.status(500).json({ message: 'Error fetching movie genres' });
    }
});

app.get('/api/genres/tv', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}&language=en-US`
        );
        res.json(response.data.genres);
    } catch (error: any) {
        console.error('TMDB TV Genres Error:', error.message);
        res.status(500).json({ message: 'Error fetching TV genres' });
    }
});

// Temporary endpoint to regenerate token
app.post('/api/auth/regenerate-token', async (req, res) => {
    try {
        const { email } = req.body;
        const User = require('./src/models/User').User;
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newToken = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        console.log(`[TOKEN] Generated new token for user: ${email}`);
        res.json({
            token: newToken,
            user: { id: user._id, name: user.name, email: user.email },
            message: 'Token regenerated successfully'
        });
    } catch (error: any) {
        console.error('Token regeneration error:', error);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/showtimes/:tmdbId', async (req, res) => {
    try {
        const { tmdbId } = req.params;
        console.log(`[DEBUG] Fetching showtimes for TMDB ID: ${tmdbId}`);

        // Register Hall model explicitly if not registered
        if (!mongoose.models.Hall) {
            require('./src/models/Hall');
        }

        const showtimes = await Showtime.find({ tmdbId: Number(tmdbId) }).populate('hall');
        console.log(`[DEBUG] Found ${showtimes.length} showtimes`);
        res.json(showtimes);
    } catch (error: any) {
        console.error('!!! SERVER SHOWTIMES ERROR !!!');
        console.error('Message:', error.message);
        res.status(500).json({ message: error.message });
    }
});

app.get('/api/showtime/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[DEBUG] Fetching specific showtime ID: ${id}`);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.error(`[DEBUG] Invalid Showtime ID format: ${id}`);
            return res.status(400).json({ message: 'Invalid Showtime ID format' });
        }

        const showtime = await Showtime.findById(id).populate('hall');
        if (!showtime) {
            console.warn(`[DEBUG] Showtime not found for ID: ${id}`);
            return res.status(404).json({ message: 'Showtime not found' });
        }
        res.json(showtime);
    } catch (error: any) {
        console.error('!!! SERVER SINGLE SHOWTIME ERROR !!!');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

app.post('/api/bookings', authMiddleware, async (req: any, res) => {
    try {
        const { showtimeId, seatLabel } = req.body;
        const showtime = await Showtime.findById(showtimeId);
        if (!showtime) return res.status(404).json({ message: 'Showtime not found' });

        const seat = showtime.seats.find((s: any) => s.label === seatLabel);
        if (!seat) return res.status(404).json({ message: 'Seat not found' });
        if (seat.status === 'booked') return res.status(400).json({ message: 'Seat already booked' });

        seat.status = 'booked';
        seat.userId = req.user;

        await showtime.save();

        // --- EMAIL NOTIFICATION START ---
        try {
            // Lazy load dependencies to fetch user email
            const User = require('./src/models/User').User;
            const { sendBookingConfirmation } = require('./src/services/emailService');

            const user = await User.findById(req.user);
            if (user) {
                // Populate order details for the email
                const orderDetails = {
                    movieTitle: showtime.movieTitle || 'Movie Ticket', // Note: movieTitle needs to be added to Showtime schema ideally or fetched
                    date: showtime.startTime ? new Date(showtime.startTime).toLocaleDateString() : 'TBD',
                    time: showtime.startTime ? new Date(showtime.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD',
                    cinemaName: 'CineBook Cinema', // Default or fetch from Hall
                    hallName: showtime.hall?.name || 'Main Hall',
                    seats: [seatLabel],
                    posterUrl: 'https://via.placeholder.com/300x450', // Would fetch actual poster if linked
                    totalPrice: seat.price || 15, // Default price fallback
                    bookingId: showtime._id.toString() + '-' + seatLabel
                };

                sendBookingConfirmation(user.email, orderDetails);
            }
        } catch (emailErr) {
            console.error('Email sending failed, but booking was successful:', emailErr);
        }
        // --- EMAIL NOTIFICATION END ---

        res.json({ message: 'Booking successful', showtime });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// NEW: Delete Booking Route
app.delete('/api/bookings/:id', authMiddleware, async (req: any, res) => {
    try {
        const bookingId = req.params.id; // This is the SEAT _id
        const userId = req.user;

        // Find the showtime that contains this seat
        const showtime = await Showtime.findOne({
            'seats._id': bookingId
        });

        if (!showtime) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Find the specific seat subdocument
        const seat = showtime.seats.find((s: any) => s._id.toString() === bookingId);

        // Verify ownership
        if (!seat || seat.userId?.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this booking' });
        }

        // Reset seat
        seat.status = 'available';
        seat.userId = null;

        await showtime.save();

        console.log(`[BOOKING] Cancelled seat ${seat.label} (ID: ${bookingId})`);
        res.json({ message: 'Booking cancelled successfully' });

    } catch (error: any) {
        console.error('Cancel Booking Error:', error);
        res.status(500).json({ message: 'Error cancelling booking' });
    }
});


// ... imports ...

app.get('/api/ticket-history', authMiddleware, async (req: any, res) => {
    try {
        const userId = req.user;
        console.log(`[DEBUG] Fetching tickets for user: ${userId}`);

        // Ensure Hall schema is registered (redundant if imported globally, but safe)
        if (!mongoose.models.Hall) {
            console.log('[DEBUG] Registering Hall model dynamically');
            require('./src/models/Hall');
        }

        const showtimes = await Showtime.find({
            'seats.userId': userId
        }).populate('hall');

        console.log(`[DEBUG] Found ${showtimes.length} showtimes with user tickets`);

        const tickets = showtimes.map(show => {
            const userSeats = show.seats.filter((s: any) => s.userId && s.userId.toString() === userId.toString());
            return {
                showtimeId: show._id,
                tmdbId: show.tmdbId,
                startTime: show.startTime,
                hallName: show.hall?.name || 'Unknown Hall',
                seats: userSeats.map((s: any) => s.label),
                bookingIds: userSeats.map((s: any) => s._id) // Add IDs for deletion
            };
        });

        res.json(tickets);
    } catch (error: any) {
        console.error('!!! SERVER TICKET HISTORY ERROR !!!');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ message: error.message, stack: error.stack });
    }
});

app.get('/api/users/watchlist', authMiddleware, async (req: any, res) => {
    try {
        const User = require('./src/models/User').User;
        const user = await User.findById(req.user);

        if (!user) return res.status(404).json({ message: 'User not found' });

        // Fetch details for all movies in watchlist from TMDB
        const moviePromises = user.watchlist.map((tmdbId: number) =>
            axios.get(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`)
        );

        const moviesResponses = await Promise.all(moviePromises);
        const movies = moviesResponses.map(r => r.data);

        res.json(movies);
    } catch (error: any) {
        console.error('Fetch Watchlist Error:', error.message);
        res.status(500).json({ message: 'Error fetching watchlist' });
    }
});

app.post('/api/users/watchlist', authMiddleware, async (req: any, res) => {
    try {
        const { tmdbId } = req.body;
        const User = require('./src/models/User').User;
        const user = await User.findById(req.user);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const index = user.watchlist.indexOf(tmdbId);
        if (index === -1) {
            user.watchlist.push(tmdbId); // Add
        } else {
            user.watchlist.splice(index, 1); // Remove
        }

        await user.save();
        res.json({ watchlist: user.watchlist });
    } catch (error: any) {
        console.error('Update Watchlist Error:', error.message);
        res.status(500).json({ message: 'Error updating watchlist' });
    }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('!!! UNHANDLED SERVER ERROR !!!');
    console.error(err);
    res.status(500).json({ message: err.message || 'Internal Server Error', stack: err.stack });
});

app.post('/api/ai-search', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ message: 'Query is required' });

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY is missing');
            return res.status(500).json({ message: 'AI service not configured' });
        }

        // 1. Gather context (movies)
        // We will fetch Now Playing and Trending to give the AI a good selection
        const [nowPlaying, trending] = await Promise.all([
            axios.get(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
            axios.get(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`)
        ]);

        // Combine and deduplicate
        const allMovies = [...nowPlaying.data.results, ...trending.data.results];
        const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.id, m])).values());

        // Simplified list for token efficiency
        const movieListJson = uniqueMovies.map(m => ({
            id: m.id,
            title: m.title,
            genre_ids: m.genre_ids,
            overview: m.overview.substring(0, 100) // Truncate for token savings
        }));

        // 2. Init Gemini
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. Construct Prompt
        const prompt = `
            Act as a 'Movie Sommelier'. The user is asking: "${query}".
            Here is a list of available movies JSON: ${JSON.stringify(movieListJson)}
            
            Task: Select the top 3 best-matching movies from the list based on the user's vibe/request.
            Output: Return strictly a JSON array (no markdown, no extra text) with this structure:
            [{ "movieId": "123", "aiReason": "Reason here..." }]
        `;

        // 4. Generate
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. Parse and Enrichment
        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const recommendations = JSON.parse(jsonStr);

        // Hydrate with full movie details
        const enrichedResults = recommendations.map((rec: any) => {
            const original = uniqueMovies.find(m => m.id.toString() === rec.movieId.toString());
            return {
                ...original,
                aiReason: rec.aiReason
            };
        }).filter((m: any) => m.title); // Ensure matches found

        res.json(enrichedResults);

    } catch (error: any) {
        console.error('AI Search Error:', error.message);
        res.status(500).json({ message: 'AI Search failed', error: error.message });
    }
});

// --- AI ROUTES ---
import { analyzeReview, predictCrowd } from './src/controllers/aiController';

app.get('/api/ai/predict-crowd/:tmdbId', predictCrowd);
app.post('/api/reviews/analyze', analyzeReview);

// --- SOCIAL & WALLET ROUTES ---
import { generateWalletPass, getShareLink } from './src/controllers/walletController';

app.get('/api/bookings/:id/pkpass', generateWalletPass);
app.get('/api/bookings/share/:orderId', getShareLink);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
