import axios from 'axios';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Hall } from './models/Hall';
import { Movie } from './models/Movie';
import { Showtime } from './models/Showtime';

dotenv.config();

const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cinebook';

const seed = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Clear existing data
        await Movie.deleteMany({});
        await Hall.deleteMany({});
        await Showtime.deleteMany({});
        console.log('Cleared existing data');

        // 2. Fetch Movies from TMDB
        const movieResponse = await axios.get(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`
        );
        const tmdbMovies = movieResponse.data.results.slice(0, 10);

        const moviesData = tmdbMovies.map((m: any) => ({
            tmdbId: m.id,
            title: m.title,
        }));
        console.log(`Fetched ${moviesData.length} movies for showtime generation`);

        // 3. Create IMAX Hall
        const rows = 12;
        const cols = 10;
        const layout: number[][] = [];
        for (let r = 0; r < rows; r++) {
            const rowArr: number[] = [];
            for (let c = 0; c < cols; c++) {
                if (c === 0 || c === cols - 1) {
                    rowArr.push(0); // Aisle
                } else if (r >= 8 && r <= 10) {
                    rowArr.push(2); // VIP
                } else {
                    rowArr.push(1); // Standard
                }
            }
            layout.push(rowArr);
        }

        const hall = new Hall({
            name: 'IMAX Theater 1',
            rows,
            cols,
            layout
        });
        await hall.save();
        console.log('Seeded IMAX Hall');

        // 4. Create Showtimes for each movie
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);

        for (const movie of moviesData) {
            const times = [new Date(tomorrow), new Date(tomorrow)];
            times[1].setHours(19, 0, 0, 0);

            for (const startTime of times) {
                const seats = [];
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const type = layout[r][c];
                        if (type === 0) continue;

                        const label = `${String.fromCharCode(65 + r)}${c + 1}`;
                        const price = type === 2 ? 25 : 15;
                        const isBooked = Math.random() < 0.2;

                        seats.push({
                            row: r,
                            col: c,
                            label,
                            type,
                            price,
                            status: isBooked ? 'booked' : 'available',
                        });
                    }
                }

                const showtime = new Showtime({
                    tmdbId: movie.tmdbId,
                    hall: hall._id,
                    startTime,
                    seats,
                });
                await showtime.save();
            }
        }

        console.log('Seeded Showtimes successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seed();
