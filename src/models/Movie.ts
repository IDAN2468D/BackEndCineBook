import mongoose, { Schema } from 'mongoose';

const movieSchema = new Schema({
    tmdbId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    overview: { type: String },
    posterPath: { type: String },
    backdropPath: { type: String },
    voteAverage: { type: Number },
    releaseDate: { type: String },
}, { timestamps: true });

export const Movie = mongoose.models.Movie || mongoose.model('Movie', movieSchema);
